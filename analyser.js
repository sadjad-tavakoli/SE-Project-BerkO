// do not remove the following comment
// JALANGI DO NOT INSTRUMENT
const fs = require('fs');
const events = require('events')
const {
    getFileName,
    getFilePath,
    getLine,
    getEndLine,
    getPositionInLine,
    isTestEntity,
    getEntityKey,
    dependeciesPath,
    getDependenciesData
} = require('./utils');

let logger = "";
let mainFileName = "";
let functionEnterStack = [];
let timeoutsQueueMap = new Map();
let accessedFiles = new Map();
let EventEmmiter = events.EventEmitter.prototype;
let addedListeners = new Map();
let emittedEvents = new Map();
let entitiesData = {};
let entityKey = process.argv[process.argv.length - 2]
let commit = process.argv[process.argv.length - 1]
const trackExternals = true;

(function (sandbox) {
    sandbox.Config.LOG_ALL_READS_AND_BRANCHES = true
    function Analyser() {
        this.invokeFunPre = function (iid, f, base, args, isConstructor, isMethod, functionIid, functionSid) {
            let fName = f.name;
            let lineNumber = getLine(iid)

            if (isImportingNewModule(iid)) {
                return { f: f, base: base, args: args, skip: false };
            }

            if (isConstructor) {
                f.isConstructor = true
                log(lineNumber + " class " + fName + "'s constructor is called with variables " + 'args' + " by " + functionEnterStack[functionEnterStack.length - 1].name)

            } else if (isAddEventlistener(f)) {
                addToAddedListener(base, args[0], args[1])

            } else if (isEmitEvent(f)) {
                let callerFunction = functionEnterStack[functionEnterStack.length - 1]
                addToEmittedEvents(base, { 'event': args[0], 'listeners': getAddedListeners(base, args[0]).slice(), 'callerFunction': callerFunction })
                log(lineNumber + " function " + callerFunction.name + " emitted event " + args[0] + " of " + base.constructor.name)
            } else {
                if (isTimeOut(f)) {
                    addToTimeoutMap('t_' + args[0] + Math.max(args[1], 1), { 'caller': functionEnterStack[functionEnterStack.length - 1], 'lineNumber': lineNumber })
                    fName += lineNumber + getPositionInLine(iid)

                } else if (isImmediate(f)) {
                    addToTimeoutMap('i_' + args[0], { 'caller': functionEnterStack[functionEnterStack.length - 1], 'lineNumber': lineNumber })
                    fName += lineNumber + getPositionInLine(iid)

                } else if (isInterval(f)) {
                    addToTimeoutMap('v_' + args[0] + args[1], { 'caller': functionEnterStack[functionEnterStack.length - 1], 'lineNumber': lineNumber })
                    fName += lineNumber + getPositionInLine(iid)

                } else if (isAnonymousFunction(f)) {
                    fName = 'anonymous' + lineNumber + getPositionInLine(iid)
                    f.anonymous_name = fName
                }
                log(lineNumber + " function " + fName + " is called with variables " + 'args' + " by " + functionEnterStack[functionEnterStack.length - 1].name)
            }

            return { f: f, base: base, args: args, skip: false };
        };

        this.functionEnter = function (iid, f, dis, args) {
            // TODO it's not readable => remove these ugly if elses 
            if (isImportingNewModule(iid)) {
                accessedFiles.set(getFilePath(iid), iid)
            } else {
                let fName = f.name;
                if (isMainFile(iid)) {
                    mainFileName = fName = getFileName(iid)
                    accessedFiles.set(fName, iid)
                    let fInfo = { 'name': fName, 'iid': iid }
                    functionEnterStack.push(fInfo)

                } else if (f.isConstructor) {
                    addDependency({ 'name': fName, 'object': f, 'iid': iid }, functionEnterStack[functionEnterStack.length - 1])
                    log(getLine(iid) + " class " + fName + "'s constructor entered with variables " + 'args from ' + functionEnterStack[functionEnterStack.length - 1].name)

                } else if (isCalledByEvents(dis)) {
                    let event = getRelatedEvent(dis, f)
                    if (fName == "") fName = 'anonymous' + getLine(iid)
                    f.calledByEvent = true;
                    log(getLine(iid) + " function " + fName + " entered with variables " + 'args' + " throught event " + event.event + " emitted by function " + event.callerFunction.name)
                    addDependency({ 'name': fName, 'object': f, 'iid': iid }, functionEnterStack[functionEnterStack.length - 1])

                } else {
                    if (isCalledByTimeoutOrInterval(dis)) {
                        let timeoutFunction;
                        if (fName == "") fName = 'anonymous' + getLine(iid)
                        if (isCalledByInterval(dis)) {
                            timeoutFunction = getTimeoutMap('v_' + f + dis._idleTimeout)[0]
                            functionEnterStack.push({ 'name': 'setInterval' + timeoutFunction.lineNumber, 'isTimer': true })

                        } else { // if called by timeout
                            timeoutFunction = popFromTimeoutMap('t_' + f + dis._idleTimeout)
                            functionEnterStack.push({ 'name': 'setTimeOut' + timeoutFunction.lineNumber, 'isTimer': true })
                        }
                        addDependency({ 'name': fName, 'object': f, 'iid': iid }, timeoutFunction.caller)

                    } else if (isCalledByImmediate(dis)) {
                        let timeoutFunction = popFromTimeoutMap('i_' + f)
                        functionEnterStack.push({ 'name': 'setImmediate' + timeoutFunction.lineNumber, 'isTimer': true })
                        if (fName == "") fName = 'anonymous' + getLine(iid)
                        addDependency({ 'name': fName, 'object': f, 'iid': iid }, timeoutFunction.caller)

                    } else if (fName == "") {
                        fName = f.anonymous_name ? f.anonymous_name : 'anonymous' + getLine(iid) + getPositionInLine(iid)
                        addDependency({ 'name': fName, 'object': f, 'iid': iid }, functionEnterStack[functionEnterStack.length - 1])

                    } else {
                        addDependency({ 'name': fName, 'object': f, 'iid': iid }, functionEnterStack[functionEnterStack.length - 1])
                    }
                    log(getLine(iid) + " function " + fName + " entered with variables " + 'args from ' + functionEnterStack[functionEnterStack.length - 1].name)
                }
                functionEnterStack.push({ 'name': fName, 'object': f, 'iid': iid })
            }
        };
        this.functionExit = function (iid, returnVal, wrappedExceptionVal) {
            if (!(isImportingNewModule(iid) || isMainFile(iid))) {
                let f = functionEnterStack.pop()
                let caller = functionEnterStack[functionEnterStack.length - 1]
                if (caller.isTimer) {
                    functionEnterStack.pop()
                }

                if (f.object.isConstructor) {
                    log(getLine(iid) + " class " + f.name + "'s constructor exited with return values " + returnVal + " to function " + caller.name);
                } else if (f.object.calledByEvent) {
                    log(getLine(iid) + " function " + f.name + " exited");
                } else {
                    log(getLine(iid) + " function " + f.name + " exited with return values " + returnVal + " to function " + caller.name);
                }
            }


            return { returnVal: returnVal, wrappedExceptionVal: wrappedExceptionVal, isBacktrack: false };
        };

        this.endExecution = function () {
            log("end Execution");
            fs.writeFileSync(path.join(__dirname, 'test/analyzerOutputs' + path.sep + mainFileName), logger, function (err) {
                if (err) {
                    return console.log(err);
                }
                console.log("The file was saved!");
            });
            mergeDependenciesAndNewData()
        };

        function getRelatedEvent(base, func) {
            let baseEmittedEvents = getEmittedEvents(base)
            let eventInfo = {}
            for (let index in baseEmittedEvents) {
                let listeners = baseEmittedEvents[index]['listeners']
                let indexOf = listeners.indexOf(func)
                if (indexOf != -1) {

                    eventInfo = baseEmittedEvents[index]
                    listeners.splice(indexOf, 1)
                    if (!listeners.length) {
                        baseEmittedEvents.splice(index, 1);
                    }
                    break;
                }
            }
            return eventInfo
        }
    }

    {

        function isMainFile(iid) {
            return (getLine(iid) == 1 && mainFileName == "") || accessedFiles.get(mainFileName) == iid
        }

        function isImportingNewModule(iid) {
            return (mainFileName != "" && mainFileName != getFileName(iid) && !(accessedFiles.has(getFilePath(iid)) && trackExternals)) || accessedFiles.get(getFilePath(iid)) == iid

        }
        function log(log_value) {
            logger += "\n#" + log_value
        }

        function isTimeOut(func) {
            return func == setTimeout
        }

        function isImmediate(func) {
            return func == setImmediate
        }

        function isInterval(func) {
            return func == setInterval
        }

        function isEmitEvent(func) {
            return func == EventEmmiter.emit
        }

        function isAddEventlistener(func) {
            return [EventEmmiter.addListener, EventEmmiter.once, EventEmmiter.prependListener, EventEmmiter.prependOnceListener].includes(func)
        }

        function isAnonymousFunction(func) {
            return func.name == "";
        }

        function isCalledByImmediate(base) {
            if (base) return base._onImmediate
            return undefined
        }

        function isCalledByTimeoutOrInterval(base) {
            if (base) return base._onTimeout
            return undefined
        }

        function isCalledByEvents(base) {
            if (base) return base.constructor.prototype == EventEmmiter
            return undefined
        }

        function isCalledByInterval(base) {
            if (base) return base._repeat
            return undefined
        }

        function addToMapList(map, key, value) {
            if (map.has(key)) {
                map.get(key).push(value)
            } else {
                map.set(key, [value])
            }
        }

        function addDependency(f, caller) {
            let i = f.iid
            let j = caller.iid
            if (!isTestEntity(i)) {
                let fileKey = getEntityKey(f.name, getFileName(i), getLine(i), getEndLine(i))
                if (!entitiesData[fileKey]) {
                    entitiesData[fileKey] = { 'tests': [], 'callers': [], 'callees': [] }
                }

                let file2Key = getEntityKey(caller.name, getFileName(j), getLine(j), getEndLine(j))
                if (isTestEntity(j)) {
                    entitiesData[fileKey]['tests'].push(file2Key)
                } else {
                    entitiesData[fileKey]['callers'].push(file2Key)
                    if (entitiesData[file2Key]) {
                        entitiesData[file2Key]['callees'].push(fileKey) // Duplication 
                    } else {
                        entitiesData[file2Key] = { 'tests': [], 'callers': [], 'callees': [fileKey] }
                    }

                }
            }
        }

        function mergeDependenciesAndNewData() {
            let data = getDependenciesData()
            if (Object.keys(data).length) {

                data = data['data']

                if (data[entityKey]) {
                    let callers = data[entityKey]['callers']
                    for (let index in callers) {
                        let caller = callers[index]
                        let entityIndex = data[caller]['callees'].indexOf(entityKey)
                        data[caller]['callees'].splice(entityIndex, 1);
                    }

                    let callees = data[entityKey]['callees']
                    for (let index in callees) {
                        let callee = callees[index]
                        let entityIndex = data[callee]['callers'].indexOf(entityKey)
                        data[callee]['callers'].splice(entityIndex, 1);
                    }

                    delete data[entityKey];
                }


                for (let entity in entitiesData) {
                    let value = entitiesData[entity]
                    if (data[entity]) {
                        data[entity]['tests'] = [...new Set([...data[entity]['tests'],...value['tests']])]
                        data[entity]['callees'] = [...new Set([...data[entity]['callees'],...value['callees']])]
                        data[entity]['callers'] = [...new Set([...data[entity]['callers'],...value['callers']])]
                    } else {
                        data[entity] = value
                    }
                }
            } else {
                data = entitiesData
            }
            fs.writeFileSync(dependeciesPath, JSON.stringify({'commitID': commit, 'data': data}))
        }

        function addToTimeoutMap(key, value) {
            addToMapList(timeoutsQueueMap, key, value)
        }

        function addToEmittedEvents(key, value) {
            addToMapList(emittedEvents, key, value)
        }

        function addToAddedListener(base, event, listener) {
            let baseEvents = addedListeners.get(base)
            if (!baseEvents) {
                addedListeners.set(base, new Map().set(event, [listener]))
            } else {
                addToMapList(baseEvents, event, listener)
            }
        }

        function popFromTimeoutMap(key) {
            if (timeoutsQueueMap.has(key)) {
                return timeoutsQueueMap.get(key).shift()
            }
        }

        function getTimeoutMap(key) {
            if (timeoutsQueueMap.has(key)) {
                return timeoutsQueueMap.get(key)
            }
            return []
        }

        function getEmittedEvents(key) {
            if (emittedEvents.has(key)) {
                return emittedEvents.get(key)
            }
            return []
        }

        function getAddedListeners(base, event) {
            let baseEvents = addedListeners.get(base)
            if (baseEvents && baseEvents.has(event)) {
                return baseEvents.get(event)
            }
            return []
        }
    }
    sandbox.analysis = new Analyser();
})(J$);
