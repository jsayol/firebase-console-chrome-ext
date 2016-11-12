{
    'use strict';

    let $injector, $mdDialog, firebaseService, rulesService, firebaseRootRef, extensionUrl, fakerjs;

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

            req.addEventListener('load', () => {
                if ((req.status >= 200) && (req.status < 300)) {
                    FBToolboxDialog.templateCache[type] = req.responseText;
                    resolve(req.responseText);
                } else {
                    reject(`Couldn't retrieve the template for dialog '${type}'`);
                }
            });

            req.addEventListener('error', () => {
                reject(`Error while retrieving the template for dialog '${type}'`);
            });

            req.open('GET', url, true);
            req.send();
        });

    };

    FBToolboxDialog.templateCache = {};

    FBToolboxDialog.dialogs = {};

    FBToolboxDialog.dialogs.demo = () => {
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
                    setTimeout(() => {
                        $scope.$evalAsync(() => { $scope.items.push(4); });
                    }, 2000);
                };

                FBToolboxDialog.show({template, locals, controller});
            })
            .catch(err => console.warn('FBToolboxDialog', err));
    };

    FBToolboxDialog.dialogs.mockData = (options) => {
        FBToolboxDialog.getTemplate('mock-data').then(template => {
            const locals = {

            };

            const controller = ($scope, $mdDialog) => {
                const parseJSON = json => {
                    try {
                        return JSON.parse($scope.jsonSchema);
                    } catch (_) {
                        return null;
                    }
                };

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

                $scope.closeDialog = () => $mdDialog.hide();

                $scope.saveContent = () => null;

                $scope.executeContent = () => null;

                $scope.previewData = () => {
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

                $scope.generateData = () => {
                    if (!options.location) {
                        throw new Error('Nowhere to set the mock data.')
                    }

                    const schema = parseJSON($scope.jsonSchema);

                    if (schema === null) {
                        $scope.jsonErrors = true;
                        return;
                    }

                    const generatedData = jsf(schema);

                    console.log('Setting new mock data at location', options.location);
                    try {
                        firebaseRootRef.child(options.location).set(generatedData);
                    } catch (e) {
                        console.log('FBToolbox', e);
                    }

                    $scope.jsonErrors = false;
                    $scope.closeDialog();
                }
            };

            FBToolboxDialog.show({template, locals, controller});

        }).catch(err => console.warn('FBToolboxDialog', err));
    };

    // Obtaining the database rules for the project.
    // Not using this yet, just saving it here for future reference.
    const getDatabaseRules = () => {
        if (!rulesService) {
            throw new Error('There is no rulesService');
        }

        rulesService.getRulesEndpoint_().then(endpoint => $.get(endpoint, rules => {
            console.log(rules);
        }));
    };

    // Return a single push key synchronously
    const generatePushKeySync = () => firebaseRootRef.push().key();

    // Return a promise with the requested number of push keys
    const generatePushKeys = ({count = 1}) =>
        Promise.resolve(Array.from({length: count}, () => generatePushKeySync()));

    // Listen to messages from the content script
    document.addEventListener('FBToolboxContentMessage', e => {
        let {id, msg, payload = null} = e.detail;
        let promise;

        if (msg == 'extensionUrl') {
            extensionUrl = payload;
        } else if (msg == 'createDialog') {
            FBToolboxDialog(payload);
        } else if (msg == 'generatePushKeys') {
            promise = generatePushKeys(payload);
        }

        if (promise) {
            promise.then(payload => document.dispatchEvent(new CustomEvent('FBToolboxInjectedResponse_' + id, {
                detail: payload
            })));
        }
    });

    const waitForInjectorInterval = setInterval(() => {
        $injector = angular.element(document).injector();

        if ($injector) {
            clearInterval(waitForInjectorInterval);

            $mdDialog = $injector.get('$mdDialog');
            firebaseService = $injector.get('firebaseService');
            rulesService = $injector.get('rulesService');

            // If we firebaseService.getRef() too soon then for some reason the database will not
            // load on the console, and that's bad. As a really terrible hack we delay getting the reference,
            // hoping that the console has had enough time to do its thing.
            // TODO: definitely look into a better approach to solve this.
            setTimeout(() => {
                firebaseService.getRef()
                    .then(ref => {
                        firebaseRootRef = ref;

                        // Notify the content script that the injected script is ready
                        document.dispatchEvent(new CustomEvent('FBToolboxInjectedMessage', {
                            detail: {msg: 'ready'}
                        }));
                    })
                    .catch(err => console.warn('FBToolbox', err));
            }, 1000);

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
