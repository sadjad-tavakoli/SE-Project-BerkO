const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const nodeprofCommand = require('./utils').nodeprofCommand
const dependeciesPath = require('./utils').dependeciesPath
const projectDirectoryTests = require('./utils').projectDirectoryTests
const matchTestNaming = require('./utils').matchTestNaming
const getEntityKey = require('./utils').getEntityKey
const getFileFromPath = require('./utils').getFileFromPath
const getExistingDependenciesData = require('./utils').getExistingDependenciesData
const getTestNameFromKey = require('./utils').getTestNameFromKey
let dependenciesData = {}
let repo = require('./utils').repo

const refDiffPath = __dirname + path.sep + "RefDiff-Berkak"

// TODO RefDiff repo would be part of this directory
const computeChangesCommands = "cd " + refDiffPath + " ; $JAVA_HOME/bin/java -XX:+ShowCodeDetailsInExceptionMessages -Dfile.encoding=UTF-8 @/var/folders/c6/w0q19v596ds_2tr377yp58zr0000gn/T/cp_buafb8c0insdm1u40g9jf15gm.argfile refdiff.berkak.RefDiffBerkak "
function run() {
  let commit = "22b9108"
  let commitArg = process.argv[2]
  let repoArg = process.argv[3]
  if (commitArg != undefined) {
    commit = commitArg

  }
  if (repoArg != undefined) {
    repo = repoArg
  }

  if (fs.existsSync(dependeciesPath)) {
    console.log('Directory found.');
    dependenciesData = getExistingDependenciesData()
    if (Object.keys(dependenciesData).length) {
      let previousCommit = dependenciesData['commitID']
      if (previousCommit.trim() == commit.trim()) {
        process.stdout.write("*****  Everything is up to date! *****")
      } else {
        dependenciesData = dependenciesData['data']
        console.log("Run analysis based on previous detections")
        runAnalysisBasedOnchanges(previousCommit)
      }
    } else {
      runAnalysis()
    }
  } else {
    fs.writeFileSync(dependeciesPath, "")
    runAnalysis()
  }

  function runAnalysisBasedOnchanges(previousCommit) {
    exec(computeChangesCommands + repo + " " + commit + " " + previousCommit, (err, stdout, stderr) => {
      if (!err) {
        let updatedFiles = JSON.parse(stdout)
        let changes = updatedFiles['changes']
        let selectedTests = {};
        for (let index in changes) {
          let item = changes[index]
          let entityKey = getEntityKey(item['name'], getFileFromPath(item['file']), item['begin'], item['end'])
          addTestsEntites(selectedTests, dependenciesData[entityKey]['tests'], entityKey)
          let emitters = dependenciesData[entityKey]['emitters']
          if (emitters) {
            for (let emitterIndex in emitters) {
              let emitter = emitters[emitterIndex]
              addTestsEntites(selectedTests, dependenciesData[emitter]['tests'], emitter)
            }
          }
        }
        let added = updatedFiles['added']

        for (let index in added) {
          let item = added[index]
          if (matchTestNaming(item['file'])) {
            addToJsonList(selectedTests, item['name'], '[]')
          }
        }
        for (let testName in selectedTests) {
          exec(nodeprofCommand + path.join(projectDirectoryTests, testName) + " " + JSON.stringify(selectedTests[testName]) + " " + commit, (err, stdout, stderr) => {
            if (!err) {
              process.stdout.write(stdout)
            }
            else {
              process.stderr.write(stderr)
            }
          })
        }
        // console.log(selectedTests)
      } else {
        process.stderr.write(stderr)
      }
    })
  }

  function runAnalysis() {
    console.log('Run analysis from scratch');
    let filenames = fs.readdirSync(projectDirectoryTests);
    filenames.forEach(testName => {
      exec(nodeprofCommand + path.join(projectDirectoryTests, testName) + "[]" + commit, (err, stdout, stderr) => {
        if (!err) {
          process.stdout.write(stdout)
        }
        else {
          process.stderr.write(stderr)

        }
      })
    });

  }
}

function addTestsEntites(json, tests, entity) {
  for (let index in tests) {
    let test = tests[index]
    addToJsonList(json, getTestNameFromKey(test), entity)
  }
}

function addToJsonList(json, key, value) {
  if (json[key]) {
      if(json[key].indexOf(value) === -1) json[key].push(value)
  } else {
      json[key] = [value]
  }
}

console.log(" * * * * * * * * * * * ")
console.log(" * * * *  Srart! * * * ")
console.log(" * * * * * * * * * * * ")

run()