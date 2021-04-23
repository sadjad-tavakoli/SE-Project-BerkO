const path = require('path')
const fs = require('fs');

const nodeprofCommand = '$GRAAL_HOME/bin/node --jvm --experimental-options --vm.Dtruffle.class.path.append=$NODEPROF_HOME/nodeprof.jar --nodeprof $NODEPROF_HOME/jalangi.js --analysis analyser.js '
const projectDirectory = "/Users/sadjadtavakoli/University/lab/temp_sample/simpleProjectTest"
const projectDirectoryTests = "/Users/sadjadtavakoli/University/lab/temp_sample/simpleProjectTest/tests"
const testsNamingFormat = "tests/"
const repo = "https://github.com/sadjad-tavakoli/temp_sample.git"
const dependeciesPath = path.join(projectDirectory, 'dependencies.json')

function getExistingDependenciesData() {
    let dependenciesData = {}
    let data = fs.readFileSync(dependeciesPath, { encoding: 'utf8', flag: 'r' });
    if (data) {
        dependenciesData = JSON.parse(data);
    }
    return dependenciesData
}

function getEntityKey(entityName, fileName, startLine, endLine) { // it's not an appropriate way to generate keys => what about same name functions with identical lenghts?
    return entityName.charAt(0).toLowerCase() + entityName.substring(1) + "--" + fileName.charAt(0).toLowerCase() + fileName.substring(1) + "--" +  (endLine - startLine)
}

function getTestNameFromKey(entityKey) {
    return entityKey.split('--')[1]
}

function getFileFromPath(filepath) {
    let temp = filepath.split(path.sep)
    return temp[temp.length - 1]
}

function isTestEntity(iid) {
    return getFilePath(iid).includes(projectDirectoryTests)
}

function matchTestNaming(name) {
    return name.includes(testsNamingFormat)
}

function getFileName(iid) {
    let directories = getFilePath(iid).split('/')
    return directories[directories.length - 1];
}

function getFilePath(iid) {
    return J$.iidToLocation(iid).split(':')[0];
}

function getLine(iid) {
    return J$.iidToLocation(iid).split(':')[1]
}

function getEndLine(iid) {
    return J$.iidToLocation(iid).split(':')[3]
}

function getPositionInLine(iid) {
    return J$.iidToLocation(iid).split(':')[2]
}

function addToMapList(map, key, value) {
    if (map.has(key)) {
        map.get(key).push(value)
    } else {
        map.set(key, [value])
    }
}

module.exports = {
    nodeprofCommand,
    projectDirectory,
    projectDirectoryTests,
    repo,
    dependeciesPath,
    matchTestNaming,
    getEntityKey,
    getFileFromPath,
    isTestEntity,
    getFileName,
    getFilePath,
    getLine,
    getEndLine,
    getPositionInLine,
    getExistingDependenciesData,
    getTestNameFromKey,
    addToMapList,


}