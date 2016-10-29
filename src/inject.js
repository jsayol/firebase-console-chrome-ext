{
    'use strict';

    let $injector, fbRootRef, extensionUrl;

    const replyToRequest = id => payload =>
        document.dispatchEvent(new CustomEvent('FBToolboxInjectedResponse_' + id, {
            detail: payload
        }));

    const generatePushKeys = ({count = 1}) => new Promise(resolve => {
        const newKeys = new Array(count);

        for (let i = 0; i < count; i++) {
            newKeys[i] = fbRootRef.push().key();
        }

        resolve(newKeys);
    });


    class FBToolboxDialog {
        static _open(data) {
            $injector.invoke($mdDialog => {
                if (!data.parent) {
                    data = Object.assign({parent: angular.element(document.body)}, data);
                }

                $mdDialog.show(data);
            });
        }

        static _getTemplate(type) {
            if (FBToolboxDialog._templates.hasOwnProperty(type)) {
                return Promise.resolve(FBToolboxDialog._templates[type]);
            } else if (!extensionUrl) {
                return Promise.reject('Unknown extension URL');
            } else {
                return new Promise((resolve, reject) => {
                    const req = new XMLHttpRequest();
                    const url = `${extensionUrl}src/dialogs/${type}.html`;

                    req.addEventListener('load', () => {
                        if ((req.status >= 200) && (req.status < 300)) {
                            FBToolboxDialog._templates[type] = req.responseText;
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
            }
        }

        static create({type, data = null}) {
            if (FBToolboxDialog._dialogs.hasOwnProperty(type)) {
                FBToolboxDialog._dialogs[type](data);
            } else {
                console.error('FBToolbox', `Unknown dialog type '${type}'`);
            }
        }
    }

    FBToolboxDialog._templates = {};

    FBToolboxDialog._dialogs = {};

    FBToolboxDialog._dialogs.demo = () => {
        // Just a demo dialog to have as a reference on how to inject data into the dialog's controller.
        // This will get removed soon.
        FBToolboxDialog._getTemplate('demo').then(template => {
            const locals = {items: [1, 2, 3]};

            const controller = ($scope, $mdDialog, items) => {
                $scope.items = items;
                $scope.closeDialog = function () {
                    $mdDialog.hide();
                }
            };

            FBToolboxDialog._open({template, locals, controller});
        }).catch(err => {
            console.warn('FBToolboxDialog', err);
        });
    };

    FBToolboxDialog._dialogs.mockData = () => {
        FBToolboxDialog._getTemplate('mock-data').then(template => {
            const locals = {};

            const controller = ($scope, $mdDialog) => {
                $scope.closeDialog = function () {
                    $mdDialog.hide();
                }
            };

            FBToolboxDialog._open({template, locals, controller});
        }).catch(err => {
            console.warn('FBToolboxDialog', err);
        });
    };


    // Listen to messages from the content script
    document.addEventListener('FBToolboxContentMessage', e => {
        let {id, msg, payload = null} = e.detail;
        let promise;

        if (msg == 'extensionUrl') {
            extensionUrl = payload;
        } else if (msg == 'createDialog') {
            FBToolboxDialog.create(payload);
        } else if (msg == 'generatePushKeys') {
            promise = generatePushKeys(payload);
        }

        if (promise) {
            promise.then(replyToRequest(id));
        }
    });

    const waitForInjectorInterval = setInterval(() => {
        $injector = angular.element(document).injector();

        if ($injector) {
            clearInterval(waitForInjectorInterval);
            $injector.invoke(firebaseService => {
                // If we firebaseService.getRef() too soon then for some reason the database will not
                // load on the console, and that's bad. As a really terrible hack we delay getting the reference,
                // hoping that the console has had enough time to do its thing.
                // TODO: definitely look into a better approach to solve this.
                setTimeout(() => {
                    firebaseService.getRef('/').then(ref => {
                        fbRootRef = ref;

                        // Notify the content script that the firebase reference is ready
                        document.dispatchEvent(new CustomEvent('FBToolboxInjectedMessage', {
                            detail: {msg: 'firebase_ready'}
                        }));
                    });
                }, 500);
            });
        }
    }, 100);
}
