(function() {
    'use strict';

    NetflixScriptHelper.showInitialLoading();

    /* Configure RequireJS for the module loading */
    NetflixScriptHelper.injectScript({
        src: '//requirejs.org/docs/release/2.2.0/minified/require.js',
        id: 'requireJS',
        onload: function () {

            var isProd = NetflixScriptConfig.MODE === 'PROD';
            var suffix = isProd ? '.min' : '';
            var folder = isProd ? 'dist' : 'dev';

            require.config({
                baseUrl: NetflixScriptConfig.BASE_URL,
                urlArgs: (isProd ? NetflixScriptConfig.VERSION : Date.now()).toString(),
                shim: {
                    bootstrap: {
                        deps: [ "jquery" ]
                    }
                },
                paths: {
                    netflix_module: folder + '/netflix-module' + suffix,
                    providers_module: folder + '/providers-module' + suffix,
                    jquery: '//code.jquery.com/jquery-2.2.3.min',
                    bootstrap: '//maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min',
                    text: '//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.12/text.min'
                },
                config: {
                    text: {
                        useXhr: function () {
                            return true;
                        }
                    }
                }
            });

            var moduleName = location.href.indexOf('netflix.com') !== -1 ? 'netflix_module' : 'providers_module';
            require([moduleName], function (module) {
                module.load();
                NetflixScriptHelper.hideInitialLoading();
            });
        }
    });

})();
