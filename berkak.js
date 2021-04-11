const fs = require('fs');
const path = require('path');    
const exec = require('child_process').exec;
const nodeprofCommand = require('./utils').nodeprofCommand
const projectDirectory = require('./utils').projectDirectory
const projectDirectoryTests = require('./utils').projectDirectoryTests
let repo = require('./utils').repo

const refDiffPath = "/Users/sadjadtavakoli/University/lab/RefDiff"

// TODO RefDiff repo would be part of this directory
const computeChangesCommands = "cd " + refDiffPath +  " ; $JAVA_HOME/bin/java -XX:+ShowCodeDetailsInExceptionMessages -Dfile.encoding=UTF-8 @/var/folders/c6/w0q19v596ds_2tr377yp58zr0000gn/T/cp_buafb8c0insdm1u40g9jf15gm.argfile refdiff.berkak.RefDiffBerkak "

function run(item) {
  let commit = "5211f1d"
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

let dependeciesPath = path.join(projectDirectory, 'dependencies.json')

if (fs.existsSync(dependeciesPath)) {
  console.log('Directory found.');
  let data = fs.readFileSync(dependeciesPath, {encoding:'utf8', flag:'r'})
  if(data && JSON.parse(data).length){
    // dependencies = JSON.parse();
    console.log("run analysis based on changes")
    runAnalysisBasedOnchanges()
  }else{
    console.log('Run analysis from scratch');  
    runAnalysis()
  }
} else {
  console.log('Directory not found.');
  runAnalysis()
}



function runAnalysisBasedOnchanges(){
  exec(computeChangesCommands + repo + " " + commit, (err, stdout, stderr) => {
    if(!err){
      let updatedFiles = JSON.parse(stdout)
      console.log(updatedFiles)
    }
  })

}

function runAnalysis(){
  let filenames = fs.readdirSync(projectDirectoryTests);  
  console.log("\nCurrent directory filenames:");
  filenames.forEach(file => {
    exec(nodeprofCommand+ path.join(projectDirectoryTests, file), (err, stdout, stderr) => {
      if(!err){
        process.stdout.write(stdout)
      }
      else{
        process.stderr.write(stderr)

      }
    })
});

}
}

  
console.log(" * * * * * * * * * * * ")
console.log(" * * * * * * * * * * * ")
console.log(" * * * hi there! * * * ")
console.log(" * * * * * * * * * * * ")
console.log(" * * * * * * * * * * * ")

run()