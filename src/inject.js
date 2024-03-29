{
    'use strict';

    let $injector, consoleContextService, $mdDialog, firebaseService, rulesService, firebaseRootRef, extensionUrl, fakerjs;

    const FBToolboxDialog = ({type, data = null}) => {
        if (FBToolboxDialog.dialogs.hasOwnProperty(type)) {
            FBToolboxDialog.dialogs[type](data);
        } else {
            console.error('FBToolbox', `Unknown dialog type '${type}'`);
        }
    };

    FBToolboxDialog.show = data => {
        if (!$mdDialog) {
            throw new Error('There is no $mdDialog');
        }

        $mdDialog.show(data);
    };

    FBToolboxDialog.getTemplate = type => {
        if (FBToolboxDialog.templateCache.hasOwnProperty(type)) {
            return Promise.resolve(FBToolboxDialog.templateCache[type]);
        }

        if (!extensionUrl) {
            return Promise.reject('Unknown extension URL');
        }

        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            const url = `${extensionUrl}src/dialogs/${type}.html`;

            req.addEventListener('load', _ => {
                if ((req.status >= 200) && (req.status < 300)) {
                    FBToolboxDialog.templateCache[type] = req.responseText;
                    resolve(req.responseText);
                } else {
                    reject(`Couldn't retrieve the template for dialog '${type}'`);
                }
            });

            req.addEventListener('error', _ => {
                reject(`Error while retrieving the template for dialog '${type}'`);
            });

            req.open('GET', url, true);
            req.send();
        });

    };

    FBToolboxDialog.templateCache = {};

    FBToolboxDialog.dialogs = {};

    FBToolboxDialog.dialogs.demo = _ => {
        // Just a demo dialog to have as a reference on how to pass data into the dialog's controller.
        // This will get removed soon.
        FBToolboxDialog.getTemplate('demo')
            .then(template => {
                const locals = {items: [1, 2, 3]};
                const controller = ($scope, $mdDialog, items) => {
                    $scope.items = items;
                    $scope.closeDialog = function () {
                        $mdDialog.hide();
                    };
                    setTimeout(_ => {
                        $scope.$evalAsync(_ => { $scope.items.push(4); });
                    }, 2000);
                };

                FBToolboxDialog.show({template, locals, controller});
            })
            .catch(err => console.warn('FBToolboxDialog', err));
    };

    FBToolboxDialog.dialogs.mockData = (options) => {
        FBToolboxDialog.getTemplate('mock-data').then(template => {
            const locals = {
                location: options.location
            };

            const controller = ($scope, $mdDialog, location) => {
                const parseJSON = json => {
                    try {
                        return JSON.parse($scope.jsonSchema);
                    } catch (_) {
                        return null;
                    }
                };

                $scope.location = location;

                $scope.highlights = null;

                $scope.jsonErrors = false;

                $scope.editorOptions = {
                    mode: {name: "javascript", json: true}
                };

                $scope.jsonSchema = JSON.stringify({
                    "type": "object",
                    "additionalProperties": false,
                    "properties": {
                        "roomName": {
                            "type": "string",
                            "faker": { "random.words": [4] }
                        },
                        "users": {
                            "type": "object",
                            "minProperties": 5,
                            "maxProperties": 10,
                            "additionalPropertiesFormat": "fb-uid",
                            "additionalProperties": {
                                "type": "object",
                                "properties": {
                                    "name": {
                                        "faker": "name.findName"
                                    },
                                    "age": {
                                        "faker": { "random.number": [99] }
                                    },
                                    "avatar": {
                                        "faker": "image.avatar"
                                    }
                                },
                                "additionalProperties": false,
                                "required": [
                                    "name",
                                    "age"
                                ]
                            }
                        },
                        "messages": {
                            "type": "object",
                            "minProperties": 10,
                            "maxProperties": 30,
                            "additionalPropertiesFormat": "fb-pushkey",
                            "additionalProperties": {
                                "type": "object",
                                "properties": {
                                    "timestamp": {
                                        "faker": "date.past"
                                    },
                                    "fromUser": {
                                        "type": "string",
                                        "format": "fb-uid"
                                    },
                                    "text": {
                                        "faker": "lorem.sentence"
                                    }
                                },
                                "additionalProperties": false,
                                "required": [
                                    "timestamp",
                                    "text"
                                ]
                            }
                        }
                    },
                    "required": [
                        "roomName",
                        "users",
                        "messages"
                    ]
                }, null, '  ');

                $scope.closeDialog = _ => $mdDialog.hide();

                $scope.saveContent = _ => null;

                $scope.executeContent = _ => null;

                $scope.previewData = _ => {
                    const schema = parseJSON($scope.jsonSchema);

                    if (schema === null) {
                        $scope.jsonErrors = true;
                        return;
                    }

                    $scope.jsonErrors = false;

                    const generatedData = jsf(schema);
                    const formattedData = JSON.stringify(generatedData, null, '  ');
                    window.open().document.write(`<pre>${$('<div/>').text(formattedData).html()}</pre>`);
                };

                $scope.generateData = _ => {
                    if (!$scope.location) {
                        throw new Error('Nowhere to set the mock data.')
                    }

                    const schema = parseJSON($scope.jsonSchema);

                    if (schema === null) {
                        $scope.jsonErrors = true;
                        return;
                    }

                    let generatedData;

                    try {
                        generatedData = jsf(schema);
                    } catch (_) {
                        $scope.jsonErrors = true;
                        return;
                    }

                    if (generatedData) {
                        // console.log('Setting new mock data at location', $scope.location);
                        try {
                            firebaseRootRef.child($scope.location).set(generatedData);
                        } catch (e) {
                            // console.log('FBToolbox', e);
                        }

                        $scope.jsonErrors = false;
                        $scope.closeDialog();
                    }
                }
            };

            FBToolboxDialog.show({template, locals, controller});

        }).catch(err => console.warn('FBToolboxDialog', err));
    };

    // Obtaining the database rules for the project.
    // Not using this yet, just saving it here for future reference.
    const getDatabaseRules = _ => {
        if (!rulesService) {
            throw new Error('There is no rulesService');
        }

        rulesService.getRulesEndpoint_().then(endpoint => $.get(endpoint, rules => {
            // console.log(rules);
        }));
    };

    // Return a single push key synchronously
    const generatePushKeySync = _ => firebaseRootRef.push().key();

    // Return a promise with the requested number of push keys
    const generatePushKeys = ({count = 1}) =>
        Promise.resolve(Array.from({length: count}, _ => generatePushKeySync()));

    const inProject = _ => {
        if (!$injector) {
            console.error('No $injector');
            return;
        }

        // console.log('inProject: initializing');

        rulesService = $injector.get('rulesService');
        firebaseService = $injector.get('firebaseService');

        // If we firebaseService.getRef() too soon then for some reason the database will not
        // load on the console, and that's bad. As a really terrible hack we delay getting the reference,
        // hoping that the console has had enough time to do its thing.
        // TODO: definitely look into a better approach to solve this, ffs.
        setTimeout(() => {
            firebaseService.getRef()
                .then(ref => { firebaseRootRef = ref; })
                .catch(err => console.warn('FBToolbox', err));
        }, 1000);

    };


    // Listen to messages from the content script
    document.addEventListener('FBToolboxContentMessage', e => {
        let {id, msg, payload = null} = e.detail;
        let promise;

        // console.log('Received FBToolboxContentMessage', msg);

        if (msg == 'extensionUrl') {
            extensionUrl = payload;
        } else if (msg == 'createDialog') {
            FBToolboxDialog(payload);
        } else if (msg == 'inProject') {
            inProject();
        } else if (msg == 'generatePushKeys') {
            promise = generatePushKeys(payload);
        }

        if (promise) {
            promise.then(payload => document.dispatchEvent(new CustomEvent('FBToolboxInjectedResponse_' + id, {
                detail: payload
            })));
        }
    });

    const waitForInjectorInterval = setInterval(_ => {
        $injector = angular.element(document).injector();

        if ($injector) {
            clearInterval(waitForInjectorInterval);

            consoleContextService = $injector.get('consoleContextService');
            $mdDialog = $injector.get('$mdDialog');

            // Notify the content script that the injected script is ready
            document.dispatchEvent(new CustomEvent('FBToolboxInjectedMessage', {
                detail: {msg: 'ready'}
            }));
        }
    }, 100);

    // Custom JSF format for push keys as property names
    jsf.format('fb-pushkey', _ => generatePushKeySync());

    // Custom JSF format for auth user IDs as property names
    jsf.format('fb-uid', gen => gen.faker.random.uuid());

    // Some aliases for the "fb-uid" format
    jsf.format('fb-uuid', jsf.format('fb-uid'));
    jsf.format('uid', jsf.format('fb-uid'));
    jsf.format('uuid', jsf.format('fb-uid'));

}
