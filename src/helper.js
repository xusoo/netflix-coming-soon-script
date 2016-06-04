(function() {
    'use strict';

    window.NetflixScriptHelper = {

        /**
         * Injects a script into the body of the page but first checks if already exists
         * @param {Object (src, id, onload) | String (src)} data
         */
        injectScript: function (data) {
            data = typeof data === 'string' ? {src: data} : data;
            if (data.id && document.querySelector('#' + data.id)) {
                if (typeof data.onload === 'function') {
                    data.onload();
                }
                return;
            }
            var script = document.createElement('script');
            if (data.src.indexOf('//') === -1) {
                data.src = NetflixScriptConfig.BASE_URL + data.src;
            }
            script.src = data.src;
            script.id = data.id;
            script.type = 'text/javascript';
            script.onload = data.onload;
            document.querySelector('body').appendChild(script);
        },

        /**
         * Injects a style into the head of the page but first checks if already exists
         * @param {Object (src, id, onload) | String (src)} data
         */
        injectStyle: function (data) {
            data = typeof data === 'string' ? {src: data} : data;
            if (data.id && document.querySelector('#' + data.id)) {
                if (typeof data.onload === 'function') {
                    data.onload();
                }
                return;
            }
            var style = document.createElement('link');
            if (data.src.indexOf('//') === -1) {
                data.src = NetflixScriptConfig.BASE_URL + data.src;
            }
            style.href = data.src;
            style.id = data.id;
            style.rel = 'stylesheet';
            style.type = 'text/css';
            style.onload = data.onload;
            document.querySelector('head').appendChild(style);
        },

        /**
         * Shows a Bootstrap's modal dialog
         * @param {String} template: Content of the dialog
         * @param {Object} data: Values to replace in the template
         * @param {Function} callback: It is called when the window has been opened
         */
        showDialog: function (template, data, callback) {

            require(['jquery', 'text!' + template, 'bootstrap'], function ($, template) {

                NetflixScriptHelper.injectStyle({src: '//maxcdn.bootstrapcdn.com/bootstrap/3.3.6/css/bootstrap.min.css', id: 'bootstrapCss'});

                Object.keys(data).forEach(function (key) {
                    template = template.replace(RegExp('\{\{' + key + '\}\}'), data[key]);
                });

                var modal = $(template);
                if (typeof callback === 'function') {
                    modal.on('shown.bs.modal', function (e) {
                        callback.call(this, e);
                    });
                }
                modal.modal({backdrop: 'static', keyboard: false});
            });

        },

        /**
         * Just a fast initial loading screen, to let the user know that the script has started running while the dependencies and modules are being downloaded
         */
        showInitialLoading: function () {
            if (!document.querySelector('#script-mask')) {
                var mask = document.createElement('div');
                mask.id = 'script-mask';
                mask.innerHTML = 'Cargando...';
                mask.style = 'width: 100%; height: 100%; background-color: white; position: fixed; z-index: 9999999; opacity: 0.6; left: 0px; top: 0px; text-align: center; font-size: 40px; color: darkgray; padding-top: 10%;';
                document.querySelector('body').appendChild(mask);
            }
        },

        /**
         * Hides the loading mask
         */
        hideInitialLoading: function () {
            document.querySelector('#script-mask').remove();
        }
    };

})();
