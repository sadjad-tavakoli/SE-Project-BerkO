// do not remove the following comment
// JALANGI DO NOT INSTRUMENT
const fs = require('fs');
const events = require('events')


let logger = "";
let mainFileName = "";
let functionEnterStack = [];
let timeoutsQueueMap = new Map();
let accessedFiles = new Map();
let EventEmmiter = events.EventEmitter.prototype;
let addedListeners = new Map();
let emittedEvents = new Map();
let functionIDs = [];
let dependencies = [];
const trackExternals = false;

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
                    addToTimeoutMap('t_' + args[0] + Math.max(args[1], 1), {'caller': functionEnterStack[functionEnterStack.length - 1], 'lineNumber': lineNumber})
                    fName += lineNumber + getPositionInLine(iid)

                } else if (isImmediate(f)) {
                    addToTimeoutMap('i_' + args[0], {'caller': functionEnterStack[functionEnterStack.length - 1], 'lineNumber': lineNumber})
                    fName += lineNumber + getPositionInLine(iid)

                } else if (isInterval(f)) {
                    addToTimeoutMap('v_' + args[0] + args[1], {'caller': functionEnterStack[functionEnterStack.length - 1], 'lineNumber': lineNumber})
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
                    functionEnterStack.push({ 'name': fName })
                    getID({ 'name': fName })

                } else if (f.isConstructor) {
                    addDependency(f, functionEnterStack[functionEnterStack.length - 1])
                    log(getLine(iid) + " class " + fName + "'s constructor entered with variables " + 'args from ' + functionEnterStack[functionEnterStack.length - 1].name)

                } else if (isCalledByEvents(dis)) {
                    let event = getRelatedEvent(dis, f)
                    if (fName == "") fName = 'anonymous' + getLine(iid)
                    f.calledByEvent = true;
                    log(getLine(iid) + " function " + fName + " entered with variables " + 'args' + " throught event " + event.event + " emitted by function " + event.callerFunction.name)
                    addDependency({ 'name': fName, 'object': f }, functionEnterStack[functionEnterStack.length - 1])

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
                        addDependency({ 'name': fName, 'object': f }, timeoutFunction.caller)

                    } else if (isCalledByImmediate(dis)) {
                        let timeoutFunction = popFromTimeoutMap('i_' + f)
                        functionEnterStack.push({ 'name': 'setImmediate' + timeoutFunction.lineNumber, 'isTimer': true })
                        if (fName == "") fName = 'anonymous' + getLine(iid)
                        addDependency({ 'name': fName, 'object': f }, timeoutFunction.caller)

                    } else if (fName == "") {
                        fName = f.anonymous_name
                        addDependency({ 'name': fName, 'object': f }, functionEnterStack[functionEnterStack.length - 1])

                    }
                    log(getLine(iid) + " function " + fName + " entered with variables " + 'args from ' + functionEnterStack[functionEnterStack.length - 1].name)
                }
                functionEnterStack.push({ 'name': fName, 'object': f })
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

            for(let i in dependencies){
                for(let j in dependencies[i]){
                    console.log("function " + functionIDs[i].name + " is called by " + functionIDs[j].name)
                    // console.log(i)
                    // console.log(j)
                    // console.log(dependencies[i])
                    // console.log(dependencies[i][j])
                }
            }
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
        function getID(func){
            let index = functionIDs.indexOf(func);
            if (index == -1) {
                functionIDs.push(func)
                index = functionIDs.length -1
            }
            return index

        }
        function getFileName(iid) {
            return getFilePath(iid).split('/')[2];
        }

        function getFilePath(iid) {
            return J$.iidToLocation(iid).split(':')[0];
        }
        function getLine(iid) {
            return J$.iidToLocation(iid).split(':')[1]
        }

        function getPositionInLine(iid) {
            return J$.iidToLocation(iid).split(':')[2]
        }

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
            return base._onImmediate
        }

        function isCalledByTimeoutOrInterval(base) {
            return base._onTimeout
        }

        function isCalledByEvents(base) {
            return base.constructor.prototype == EventEmmiter
        }

        function isCalledByInterval(base) {
            return base._repeat
        }

        function addToMapList(map, key, value) {
            if (map.has(key)) {
                map.get(key).push(value)
            } else {
                map.set(key, [value])
            }
        }

        function addDependency(f, caller){
            let fID = getID(f)
            let callerID = getID(caller)
            if(dependencies.indexOf(fID) == -1){
                dependencies[fID] = []
            }
            dependencies[fID][callerID] = 1
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
