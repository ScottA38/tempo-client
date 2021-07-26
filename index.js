const readline = require('readline');
const fs = require('fs');
const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});
const prompt = '>>>';

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function input(prompt) {
    console.log(prompt);
    return (await rl[Symbol.asyncIterator]().next()).value;
}

async function main() {
    console.log('Choose tempo operation:');

    let files = fs.readdirSync('tasks');
    let fileIndex = -1;

    for (let i = 0; i < files.length; i++) {
        console.log(i + ' ' + files[i]);
    }

    while (files[fileIndex] === undefined) {
        fileIndex = await input(prompt);
    }

    require('./tasks/' + files[fileIndex]);
}

main();
