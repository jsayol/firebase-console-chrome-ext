{
    'use strict';

    let $injector, $mdDialog, fbService, fbRootRef, extensionUrl;

    const replyToRequest = id => payload =>
        document.dispatchEvent(new CustomEvent('FBToolboxInjectedResponse_' + id, {
            detail: payload
        }));

    const generatePushKeys = ({count = 1}) => Promise.resolve(Array.from({length: count}, () => fbRootRef.push().key()));

    const FBToolboxDialog = ({type, data = null}) => {
        if (FBToolboxDialog.dialogs.hasOwnProperty(type)) {
            FBToolboxDialog.dialogs[type](data);
        } else {
            console.error('FBToolbox', `Unknown dialog type '${type}'`);
        }
    };

    FBToolboxDialog.show = data => {
        if (!$mdDialog) {
            throw new Error('It seems we weren\'t able to get $mdDialog');
        }

        if (!data.parent) {
            data = Object.assign({parent: angular.element(document.body)}, data);
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
                    }
                };

                FBToolboxDialog.show({template, locals, controller});
            })
            .catch(err => console.warn('FBToolboxDialog', err));
    };

    FBToolboxDialog.dialogs.mockData = () => {
        FBToolboxDialog.getTemplate('mock-data')
            .then(template => {
                const locals = {};

                const controller = ($scope, $mdDialog) => {
                    $scope.closeDialog = function () {
                        $mdDialog.hide();
                    }
                };

                FBToolboxDialog.show({template, locals, controller});
            })
            .catch(err => console.warn('FBToolboxDialog', err));
    };

    // Obtaining the database rules for the project.
    // Not using this yet, just saving it here for future reference.
    // const getDBRules = () => {
    //     fbService.getToken().then(
    //         auth => $.get(`${fbService.getUrl(fbs.getNamespace())}/.settings/rules.json?auth=${auth}`, rules => {
    //             console.log(rules);
    //         })
    //     );
    // };


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
            promise.then(replyToRequest(id));
        }
    });

    const waitForInjectorInterval = setInterval(() => {
        $injector = angular.element(document).injector();

        if ($injector) {
            clearInterval(waitForInjectorInterval);
            $injector.invoke(['$mdDialog', 'firebaseService', (_$mdDialog, _fbService) => {
                $mdDialog = _$mdDialog;
                fbService = _fbService;

                // If we firebaseService.getRef() too soon then for some reason the database will not
                // load on the console, and that's bad. As a really terrible hack we delay getting the reference,
                // hoping that the console has had enough time to do its thing.
                // TODO: definitely look into a better approach to solve this.
                setTimeout(() => {
                    fbService.getRef('/').then(ref => {
                        fbRootRef = ref;

                        // Notify the content script that the injected script is ready
                        document.dispatchEvent(new CustomEvent('FBToolboxInjectedMessage', {
                            detail: {msg: 'ready'}
                        }));
                    });
                }, 500);
            }]);
        }
    }, 100);
}
