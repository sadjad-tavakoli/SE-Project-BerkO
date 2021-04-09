const fs = require('fs');
const path = require('path');    
const exec = require('child_process').exec;

const refDiffPath = "/Users/sadjadtavakoli/University/lab/RefDiff"
const nodeprofCommand = '$GRAAL_HOME/bin/node --jvm --experimental-options --vm.Dtruffle.class.path.append=$NODEPROF_HOME/nodeprof.jar --nodeprof $NODEPROF_HOME/jalangi.js --analysis analyser.js test/unit_tests/'

// TODO RefDiff repo would be part of this directory
const computeChangesCommands = "cd " + refDiffPath +  " ; $JAVA_HOME/bin/java -XX:+ShowCodeDetailsInExceptionMessages -Dfile.encoding=UTF-8 @/var/folders/c6/w0q19v596ds_2tr377yp58zr0000gn/T/cp_buafb8c0insdm1u40g9jf15gm.argfile refdiff.berkak.RefDiffBerkak "

function run(item) {
  let commit = "5211f1d"
  let repo = "https://github.com/sadjad-tavakoli/temp_sample.git"
  let commitArg = process.argv[2]
  let repoArg = process.argv[3]
  if(commitArg!=undefined){
      commit = commitArg
  }
  if(repoArg != undefined){
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


  exec(computeChangesCommands + repo + " " + commit, (err, stdout, stderr) => {
    if(!err){
      let updatedFiles = JSON.parse(stdout)
      console.log(updatedFiles)
    }
    return {'changes' : "error"}
  })

}

  
console.log(" * * * * * * * * * * * ")
console.log(" * * * * * * * * * * * ")
console.log(" * * * hi there! * * * ")
console.log(" * * * * * * * * * * * ")
console.log(" * * * * * * * * * * * ")

run()