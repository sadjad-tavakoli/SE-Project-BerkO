const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;
const nodeprofCommand = require('./utils').nodeprofCommand
const dependeciesPath = require('./utils').dependeciesPath
const projectDirectoryTests = require('./utils').projectDirectoryTests
const getEntityKey = require('./utils').getEntityKey
const getFileFromPath = require('./utils').getFileFromPath
const getDependenciesData = require('./utils').getDependenciesData
const getTestNameFromKey = require('./utils').getTestNameFromKey
let dependenciesData = {}

let repo = require('./utils').repo

const refDiffPath = __dirname + path.sep + "RefDiff-Berkak"

// TODO RefDiff repo would be part of this directory
const computeChangesCommands = "cd " + refDiffPath + " ; $JAVA_HOME/bin/java -XX:+ShowCodeDetailsInExceptionMessages -Dfile.encoding=UTF-8 @/var/folders/c6/w0q19v596ds_2tr377yp58zr0000gn/T/cp_buafb8c0insdm1u40g9jf15gm.argfile refdiff.berkak.RefDiffBerkak "

function run() {
  let commit = "70cd791 "
  let commitArg = process.argv[2]
  let repoArg = process.argv[3]
  if (commitArg != undefined) {
    commit = commitArg

  }
  if (repoArg != undefined) {
    repo = repoArg
  }

  // 1- get parent commit
  // 2- find out how to access a commits files (probably using Refdiff codes)
  // 3- check whether there is a dependency file in that version of code 
  // if YES: 
  // get related tests to our detected changes
  // if NO:
  // run tests on that version of project 
  // store dependencies
  // get related tests to our detected changes
  // 4- Run those detected tests 
  // 5- update dependecies table based on this execution result

  if (fs.existsSync(dependeciesPath)) {
    console.log('Directory found.');
    dependenciesData = getDependenciesData()
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
    fs.writeFileSync( dependeciesPath, "")
    runAnalysis()
  }



  function runAnalysisBasedOnchanges(previousCommit) {
    exec(computeChangesCommands + repo + " " + commit + " " + previousCommit, (err, stdout, stderr) => {
      if (!err) {
        let updatedFiles = JSON.parse(stdout)
        let changes = updatedFiles['changes']
        for (let index in changes) {
          let item = changes[index]
          let entityKey = getEntityKey(item['name'], getFileFromPath(item['file']), item['begin'], item['end'])
          let tests = dependenciesData[entityKey]['tests']
            for (let testIndex in tests) {
            let test = tests[testIndex]
            let testName = getTestNameFromKey(test)
            exec(nodeprofCommand + path.join(projectDirectoryTests, testName) + " " + entityKey + " " + commit, (err, stdout, stderr) => {
              if (!err) {
                process.stdout.write(stdout)
              }
              else {
                process.stderr.write(stderr)
              }
            })
          }
        }
      } else {
        process.stderr.write(stderr)
      }
    })


  }

  function runAnalysis() {
    console.log('Run analysis from scratch');
    let filenames = fs.readdirSync(projectDirectoryTests);
    filenames.forEach(testName => {
      exec(nodeprofCommand + path.join(projectDirectoryTests, testName) + " __NULL__ " + commit, (err, stdout, stderr) => {
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


console.log(" * * * * * * * * * * * ")
console.log(" * * * *  Srart! * * * ")
console.log(" * * * * * * * * * * * ")

run()