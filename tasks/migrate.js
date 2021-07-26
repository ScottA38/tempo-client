const request = require('request-promise-native');
const userData = require('../credentials.json');
const externalData = userData.summit;
const internalData = userData.scandiweb;
const date = '2021-07-22';
const endDate = '2021-07-23';
const externalOptions = {
    uri: `https://api.tempo.io/core/3/worklogs/user/${externalData.user}?from=${date}&to=${endDate}`,
    auth: {
        bearer: externalData.bearer
    }
}
const externalLogs = request(externalOptions);

externalLogs.then((response) => {
    const parsedResponse = JSON.parse(response);
    const issues = parsedResponse.results;
    const issuesToPush = [];
    issues.forEach((issue) => {
        console.log(`Issue ${issue.issue.key}, started at ${issue.startTime} for ${issue.timeSpentSeconds} seconds`);
        let issueKey = 'SM-1';

        const issueToPush = {
            issueKey,
            timeSpentSeconds: issue.timeSpentSeconds,
            startDate: issue.startDate,
            startTime: issue.startTime,
            description: issue.issue.key.concat(':\n', issue.description),
            authorAccountId: issue.author.accountId,
            attributes: []
        }
        issuesToPush.push(issueToPush);
    });
    console.log('Issues that will be pushed:');
    issuesToPush.forEach((issue) => {
        const internalOptions = {
            method: 'POST',
            uri: `https://api.tempo.io/core/3/worklogs`,
            auth: {
                bearer: internalData.bearer
            },
            body: issue,
            json: true
        }
        request(internalOptions).then((response) => {
            console.log(response);
        }).catch((err) => {
            console.log(err);
        });
    });
});
