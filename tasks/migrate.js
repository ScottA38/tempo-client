const request = require('request-promise-native');
const jsum = require('jsum');
const userData = require('../.tempo-credentials.json');
const db = require('../db-connect');
let clientName = 'summit';
const externalData = userData[clientName];
const internalData = userData.scandiweb;
const date = '2021-07-27';
const endDate = getFormattedCurrentDate();
const externalOptions = {
    uri: `https://api.tempo.io/core/3/worklogs/user/${externalData.user}?from=${date}&to=${endDate}`,
    auth: {
        bearer: externalData.bearer
    }
}
const externalLogs = request(externalOptions);

function getFormattedCurrentDate() {
    let today = new Date();
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
    ].join('-');
}

function getExistingClientLog(receivedId) {
    return new Promise(function (resolve, reject) {
        let queryResults = null;
        db.query("SELECT * FROM ticket_migration WHERE client_name = ? AND client_id = ?",
            [clientName, receivedId],
            function (error, results, fields) {
                if (error) {
                    reject(error);
                }
                resolve(results);
            }
        );
    });
}

function registerNewClientLog(issueResponse, clientId, clientName, clientHash) {
    return new Promise(function (resolve, reject) {
        db.query("INSERT INTO ticket_migration (client_id,  internal_id, client_name, client_hash)" +
            "VALUES (?, ?, ?, ?)",
            [clientId, issueResponse.tempoWorklogId, clientName, clientHash],
            function (error, results, fields) {
                if (error) {
                    reject(error);
                }
                resolve(results);
            }
        );
    })
}

async function migrateIssue(issue) {
    console.log(`Issue ${issue.issue.key}, started at ${issue.startTime} for ${issue.timeSpentSeconds} seconds`);
    let issueKey = 'SM-1';
    const issueToPush = {
        issueKey,
        timeSpentSeconds: issue.timeSpentSeconds,
        startDate: issue.startDate,
        startTime: issue.startTime,
        description: `${issue.issue.key}:\n${issue.description}`,
        authorAccountId: issue.author.accountId,
        attributes: []
    }
    let clientIssueCheckSum = jsum.digest(issue, 'SHA256', 'hex');
    let existingLogRecord = await getExistingClientLog(issue.tempoWorklogId)

    if (existingLogRecord.length && clientIssueCheckSum !== existingLogRecord.client_hash) {
        let updateInternalOptions = {
            method: 'PUT',
            uri: `https://api.tempo.io/core/3/worklogs/${issue.tempoWorklogId}`,
            auth: {
                bearer: internalData.bearer
            },
            body: issueToPush,
            json: true
        }

        request(updateInternalOptions)
            .then(function (response) {
                console.log(`Updated timelog ${issue.tempoWorklogId} from issue ${issue.issue.key}`);
                console.log(response);
            })
            .catch(function(err) {
                throw err;
            }
        );
    } else if (!existingLogRecord.length) {
        const internalOptions = {
            method: 'POST',
            uri: `https://api.tempo.io/core/3/worklogs`,
            auth: {
                bearer: internalData.bearer
            },
            body: issueToPush,
            json: true
        }

        request(internalOptions).then((response) => {
            console.log(response);
            registerNewClientLog(response, issue.tempoWorklogId, clientName, clientIssueCheckSum);
            console.log(`Created new timelog ${response.tempoWorklogId}, mapping issue ${issue.issue.key} to ${issueKey}`);
        }).catch((err) => {
            console.log(err);
        });
    }
}

externalLogs.then((response) => {
    const parsedResponse = JSON.parse(response);
    const issues = parsedResponse.results;

    issues.forEach((issue) => {
        migrateIssue(issue);
    });
});
