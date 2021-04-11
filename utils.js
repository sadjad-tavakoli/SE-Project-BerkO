const nodeprofCommand = '$GRAAL_HOME/bin/node --jvm --experimental-options --vm.Dtruffle.class.path.append=$NODEPROF_HOME/nodeprof.jar --nodeprof $NODEPROF_HOME/jalangi.js --analysis analyser.js '
const projectDirectory = "/Users/sadjadtavakoli/University/lab/temp_sample/simpleProjectTest"
const projectDirectoryTests = "/Users/sadjadtavakoli/University/lab/temp_sample/simpleProjectTest/tests"
const repo = "https://github.com/sadjad-tavakoli/temp_sample.git"
const path = require('path')

function getEntityKey(entityName, fileName, startLine, endLine) {
    return entityName.charAt(0).toLowerCase() + entityName.substring(1) + "--" + fileName.charAt(0).toLowerCase() + fileName.substring(1) + "--" + startLine + ':' + endLine
}

function getFileFromPath(filepath) {
    let temp = filepath.split(path.sep)
    return temp[temp.length - 1]
}
module.exports = { nodeprofCommand, projectDirectory, projectDirectoryTests, repo, getEntityKey, getFileFromPath }