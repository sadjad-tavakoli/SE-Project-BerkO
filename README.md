# BerkO
BerkO is a function-level dynamic analysis tool that captures functions dependency using test selection. To run BerkO, you should enable NodeProf and RefDiff as the main components of BerkO. 

------------------------------------------------------------

# NodeProf 
(https://github.com/Haiyang-Sun/nodeprof.js.git)
[![Build Status](https://api.travis-ci.com/Haiyang-Sun/nodeprof.js.svg?branch=master)](https://travis-ci.com/Haiyang-Sun/nodeprof.js)

An efficient instrumentation and profiling framework for [Graal.js](https://github.com/graalvm/graaljs).

## Getting Started
Get the [mx](https://github.com/graalvm/mx) build tool:

```
git clone https://github.com/graalvm/mx.git
```

Download and set the JAVA_HOME to the given JDK needed for building:

```
wget https://github.com/graalvm/openjdk8-jvmci-builder/releases/download/jvmci-0.46/openjdk-8u172-jvmci-0.46-linux-amd64.tar.gz
tar xvf openjdk-8u172-jvmci-0.46-linux-amd64.tar.gz
export JAVA_HOME=PATH_TO_THIS_JDK
```

Get dependent projects and build:

```
mkdir workspace-nodeprof
cd workspace-nodeprof
git clone https://github.com/Haiyang-Sun/nodeprof.js.git
cd nodeprof.js
mx sforceimports
mx build
```

Run tests:
```
mx test-all
```

Detailed explanation can be found in the [Tutorial](https://github.com/Haiyang-Sun/nodeprof.js/blob/master/Tutorial.md);

## Goals
The goals of NodeProf are:

* Use AST-level instrumentation which can benefit from the partial evaluation of the Graal compiler and have a much lower overhead compared to source-code instrumentation framework such as Jalangi
* Compatible to analysis written in Jalangi [detail](https://github.com/Haiyang-Sun/nodeprof.js/blob/master/Difference.md).
* Comprehensive coverage for NPM modules and Node.js libraries.
* Compliant to the latest ECMAScript specification (thanks to Graal.js)

## Author

* Haiyang Sun
	- haiyang.sun@usi.ch
	- Università della Svizzera italiana (USI), Lugano, Switzerland

## Publication

* Efficient dynamic analysis for Node.js [link](https://dl.acm.org/citation.cfm?id=3179527)

## Licence

NodeProf is available under the following license:

* [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0)

------------------------------------------------------------
# RefDiff 
(https://github.com/sadjad-tavakoli/RefDiff.git)
RefDiff originally is a tool to mine refactorings in the commit history of git repositories. This version of RefDiff can't find refactors and is changed to detect changed entities between two revisions.

## Getting started

Before building the project, make sure you have git and a Java Development Kit (JDK) version 8 installed in your system. Also, set the JAVA_HOME environment variable to point to the installation directory of the desired JDK.

Use gradle to create the Eclipse IDE project metadata. For example, in Windows systems:

```
cd RefDiff-Berkak
gradlew eclipse
```

Note that in Linux or Mac you should run `./gradlew eclipse` to run the gradle wrapper.

------------------------------------------------------------
# BerkO

After installing NodeProf and RefDiff, you should specify your project's main directory and test directory in BerkO/utils.js. Then run the following command:
```
node berkak.js [commit_id] [projec_repository] 
```
You can also set project_repository in BerkO/utils.js as well, instead of passing it as a argument. 

