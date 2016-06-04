define(['exports'], function (exports) {
    'use strict';

    /* MOVIE PROVIDERS */
    var providers = [];
    var registerProvider = function (provider) {
        console.log('Registering movie provider ' + provider.name);
        providers.push(provider);
    };

    registerProvider({
        name: 'UnoGS',
        url: 'unogs.com',
        nodeListSelector: '#listdiv > a',
        nodeParser: function (node) {
            var id = node.getAttribute('href').match(/\/video\/\?v\=(\d+)/)[1];
            var title = node.querySelector('b').textContent;
            var thumb = node.querySelector('img.img-rounded').src;
            return {id: id, title: title, thumb: thumb};
        }
    });

    registerProvider({
        name: 'FlickSurfer',
        url: 'flicksurfer.com',
        nodeListSelector: '.flicks > .media',
        nodeParser: function (node) {
            var link = node.querySelector('a[href*="netflix.com"]');
            var id = link.getAttribute('href').match(/\/WiMovie\/(\d+)/)[1];
            var title = node.querySelector('h4.media-heading').textContent;
            var thumb = node.querySelector('.movie-image > img').getAttribute('data-original');
            return {id: id, title: title, thumb: thumb};
        }
    });

    registerProvider({
        name: 'FlixList',
        url: 'flixlist.com.au',
        nodeListSelector: '#titles > .title',
        nodeParser: function (node) {
            var link = node.querySelector('a.link-title');
            var id = link.getAttribute('href').match(/\/titles\/(\d+)/)[1];
            var title = node.querySelector('img').title;
            var thumb = node.querySelector('img').src;
            return {id: id, title: title, thumb: thumb};
        }
    });

    registerProvider({
        name: 'Moreflicks',
        url: 'moreflicks.com',
        nodeListSelector: '.grid > .ubu-lineup__item',
        nodeParser: function (node) {
            var link = node.querySelector('a[href*="netflix.com"]');
            var id = link.getAttribute('href').match(/\/watch\/(\d+)/)[1];
            var title = node.querySelector('.ubu-cta__link').textContent;
            var thumb = node.querySelector('img').getAttribute('data-asset');
            return {id: id, title: title, thumb: thumb};
        }
    });

    registerProvider({
        name: 'InstantWatcher',
        url: 'instantwatcher.com',
        nodeListSelector: '.title-results-page .list-title',
        nodeParser: function (node) {
            var link = node.querySelector('a[href*="netflix.com"]');
            var id = link.getAttribute('href').match(/\/watch\/(\d+)/)[1];
            var title = node.querySelector('.title > .title-link').textContent;
            var thumb = node.querySelector('img.iw-boxart').src;
            return {id: id, title: title, thumb: thumb};
        }
    });

    exports.load = function () {
        var titles = [];

        /* Choose provider depending on the current URL */
        providers.forEach(function (provider) {
            if (location.href.indexOf(provider.url) !== -1) {
                var nodeList = document.querySelectorAll(provider.nodeListSelector);
                Array.prototype.forEach.call(nodeList, function (node) {
                    try {
                        titles.push(provider.nodeParser.call(this, node));
                    } catch (e) {
                        console.error(e);
                    }
                });
                return false;
            }
        });

        if (titles.length > 0) {
            var codeToCopy = JSON.stringify(titles);
            codeToCopy = btoa(unescape(encodeURIComponent(codeToCopy))); //Base64 encode
            NetflixScriptHelper.showDialog('templates/provider-generated-code.html', {numberOfTitles: titles.length, codeToCopy: codeToCopy});
        } else {
            alert('Ejecuta el script primero desde una de las webs compatibles (' + providers.map(function (provider) { return provider.name; }).join(', ') + ') y asegúrate de estar en la sección del buscador o donde aparezca la lista de títulos de Netflix.');
        }
    };

});
