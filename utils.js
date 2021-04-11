const nodeprofCommand = '$GRAAL_HOME/bin/node --jvm --experimental-options --vm.Dtruffle.class.path.append=$NODEPROF_HOME/nodeprof.jar --nodeprof $NODEPROF_HOME/jalangi.js --analysis analyser.js '
const projectDirectory = "/Users/sadjadtavakoli/University/lab/temp_sample/simpleProjectTest"
const projectDirectoryTests = "/Users/sadjadtavakoli/University/lab/temp_sample/simpleProjectTest/tests"
const repo = "https://github.com/sadjad-tavakoli/temp_sample.git"

function getEntityKey(entityName, fileName, startLine, endLine){
    return entityName + "--" + fileName + "--" + startLine + ':' + endLine     
}

module.exports = {nodeprofCommand, projectDirectory, projectDirectoryTests, repo, getEntityKey}