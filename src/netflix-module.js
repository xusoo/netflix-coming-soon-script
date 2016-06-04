define(['exports', 'jquery', 'bootstrap'], function (exports, $) {
    'use strict';

    var alreadyCheckedTitles = JSON.parse(sessionStorage.getItem('ALREADY_CHECKED_TITLES')) || {};

    var NetflixAvailability = {
        NOT_AVAILABLE: 0,
        COMING_SOON: 1,
        COMING_REALLY_SOON: 2,
        ALREADY_AVAILABLE: 3
    };

    var NetflixAvailabilityNames = ['No disponible', 'Disponible en un futuro', 'Disponible pronto', 'Ya disponible'];

    var MAX_CONCURRENT_REQUESTS = 4;

    var total, count = 0;

    var comingSoon = [], comingReallySoon = [];

    var modal, modalOutput, progressBar;

    exports.load = function () {
        askForCode(parseCodeAndStart);
    };

    /**
     * Shows a modal dialog asking for the code the user just copied from one of the supported providers
     * @param {function} callback Will be executed with the code pasted by the user
     */
    function askForCode(callback) {
        NetflixScriptHelper.showDialog('templates/netflix-code.html', [], function (e) {
            modal = $(this);
            var codeInput = modal.find('#pastedCode');
            codeInput.focus();

            var start = function () {
                var pastedCode = codeInput.val();
                if (!pastedCode) {
                    codeInput.parent('.form-group').addClass('has-error');
                    codeInput.focus();
                    return;
                }
                try {
                    callback(pastedCode);
                } catch (e) {
                    console.log(e);
                    alert('Error al leer la lista de películas: ' + e);
                }
            };
            codeInput.keypress(function(event) {
                if (event.which == 13) {
                    start();
                }
            });
            modal.find('#startScript').click(start);
        });
    }

    /**
     * Decodes and parses to JSON
     * @param {string} code: serialized and encoded
     * @return {string} decoded list of Netflix titles
     */
    function parseCode(code) {
        return JSON.parse(decodeURIComponent(escape(atob(code))));
    }

    /**
     * Obtains the list from the code and starts processing
     * @param {string} code
     */
    function parseCodeAndStart(code) {
        var list = parseCode(code);

        //Clear modal output
        modal.find('#pastedCode').hide();
        modal.find('.modal-footer').hide();
        modalOutput = modal.find('.modal-body #scriptOutput');
        modalOutput.show();
        progressBar = modal.find('.progress-bar');
        modal.find('.modal-title').html('Ejecutando script...');

        startScript(list);
    }

    /**
     * Puts all the movies into an AsyncExecutor, which will run every task keeping in mind the MAX_CONCURRENT_REQUESTS value
     */
    function startScript(list) {

        var iterator = new Iterator(list || []);
        
        total = iterator.length;

        var executor = new AsyncExecutor(MAX_CONCURRENT_REQUESTS);
        var task = function (next) {
            checkNetflixAvailability(iterator.next(),
                function (availability, movie) {
                    processMovie(availability, movie);
                    next();
                }, function (err, movie) {
                    console.log('Error al procesar la película \'' + movie.title + '\'');
                    next();
                }
            );
        };
        for (var i = 0; i < list.length; i++) {
            executor.submit(task);
        }
        executor.then(function () {
            progressBar.hide();
            showResult();

            /* Save the checked titles in the current session, just in case the user runs again the script with the same input */
            sessionStorage.setItem('ALREADY_CHECKED_TITLES', JSON.stringify(alreadyCheckedTitles));
        });

    }

    /**
     * Array-based Iterator
     */
    function Iterator(arr) {
        var index = 0;

        this.next = function () {
            return this.hasNext() ? arr[index++] : null;
        };

        this.hasNext = function () {
            return index < arr.length;
        };

        this.length = arr.length;
    }

    /**
     * Allows to submit multiple async tasks that will execute in parallel within the limit established by the 'max' parameter
     *
     * @param {number} max: Maximum of tasks that will run at the same time
     */
    function AsyncExecutor(max) {
        var queue = [];
        var runningCount = 0;
        var whenAllExecuted;

        this.submit = function (fn) {
            if (runningCount < max) {
                runningCount++;
                fn(endCallback);
            } else {
                queue.push(fn);
            }
            return this;
        };

        var endCallback = function () {
            runningCount--;
            if (queue.length > 0) {
                var fn = queue.shift();
                runningCount++;
                fn(endCallback);
            } else if (typeof whenAllExecuted === 'function' && runningCount === 0) {
                whenAllExecuted();
            }
        };

        /**
         * Will be called when all the submitted tasks end
         */
        this.then = function (cb) {
            whenAllExecuted = cb;
            if (runningCount === 0 && queue.length === 0) {
                whenAllExecuted();
            }
        };
    }

    /**
     * Makes a request to Netlix.com and calls back with the availability of the movie
     */
    function checkNetflixAvailability(movie, callback, errorCallback) {

        /* Already checked on this session. Skipping... */
        if (typeof alreadyCheckedTitles[movie.id] !== 'undefined') {
            callback(alreadyCheckedTitles[movie.id], movie);
            return;
        }

        $.get({
            url: '/title/' + movie.id,
            timeout: 15000
        })
        .done(function(data, status, xhr) {
            try {
                console.log('OK: ' + movie.title + ' (' + movie.id + ')');
                var availability = parseResponse(data, xhr.getResponseHeader('X-Originating-URL') || '', movie);
                callback(availability, movie);
            } catch (e) {
                console.error(e);
                errorCallback(e, movie);
            }
        })
        .fail(function(xhr, status) {
            if (status === 'timeout') {
                console.log('TIMEOUT: ' + movie.title + ' (' + movie.id + ')');
                /* Timeout, try again */
                checkNetflixAvailability(movie, callback, errorCallback);
            } else {
                errorCallback(status, movie);
            }
        });
    }

    /**
     * Process the movie and its availability to add it to one list or another, and outputs the result to the window
     */
    function processMovie(availability, movie) {
        count++;

        progressBar.css('width', ((count / total) * 100) + '%');
        progressBar.text(count + ' de ' + total);

        if (availability === NetflixAvailability.COMING_SOON) {
            comingSoon.push(movie);
            output('<b>' + movie.title + ': ' + NetflixAvailabilityNames[availability] + '</b>');
        } else if (availability === NetflixAvailability.COMING_REALLY_SOON) {
            comingReallySoon.push(movie);
            output('<b>' + movie.title + ': ' + NetflixAvailabilityNames[availability].toUpperCase() + '</b>');
        } else if (availability === NetflixAvailability.NOT_AVAILABLE) {
            output('<s style="color: lightgray;">' + movie.title + ': ' + NetflixAvailabilityNames[availability] + '</s>');
        } else {
            output('<span style="color: gray;">' + movie.title + ': ' + NetflixAvailabilityNames[availability] + '</span>');
        }

        alreadyCheckedTitles[movie.id] = availability;

    }

    /**
     * Parses the AJAX response to know if the movie is available, not available or it will be soon.
     */
    function parseResponse(response, url, movie) {

        /* Parse to DOM */
        var domElement = new DOMParser().parseFromString(response, 'text/html');

        /* If the URL looks like "netflix.com/browse" means that we have been redirected to the frontpage, so the movie is not available and won't be soon */
        var detailsAvailable = url.indexOf('/browse') === -1;

        /* Doesn't have a Play button: It's coming soon, but still not available */
        var comingSoon = detailsAvailable && !domElement.querySelector('.playRing');
        var comingReallySoon;

        if (comingSoon && domElement.querySelector('div.title')) {
            /* The page title is the official real title and doesn't show up as 'MOVIE' or 'SHOW': It's coming really soon, almost all the details of the movie are present */
            var pageMovieTitle = domElement.querySelector('div.title').textContent;
            var placeHolderTitle = pageMovieTitle === 'SHOW' || pageMovieTitle === 'MOVIE';
            comingReallySoon = !placeHolderTitle;

            /* Better use the official (i18n) title then */
            if (!placeHolderTitle) {
                movie.title = pageMovieTitle;
            }
        }

        var code = NetflixAvailability.NOT_AVAILABLE;
        if (comingReallySoon) {
            code = NetflixAvailability.COMING_REALLY_SOON;
        } else if (comingSoon) {
            code = NetflixAvailability.COMING_SOON;
        } else if (detailsAvailable) {
            code = NetflixAvailability.ALREADY_AVAILABLE;
        }

        return code;
    }


    /**
     * Prints the results into the modal window
     */
    function showResult() {
        modal.find('.modal-title').html('Resultado');
        if (comingSoon.length || comingReallySoon.length) {
            modalOutput.slideUp('slow', function () {
                modalOutput.html(''); //Clear
                printHTML(comingSoon, comingReallySoon);
                printBBCode(comingSoon, comingReallySoon);
                modalOutput.fadeIn();
            });
        } else {
            modalOutput.slideUp('slow', function () {
                modalOutput.html(''); //Clear
                output('<div style="text-align: center;"><h3>No he encontrado nada que<br>se vaya a estrenar próximamente...</h3> <h1>:(</h1></div>');
                modalOutput.fadeIn();
            });
        }

    }

    /**
     * Writes the message to the modal window
     */
    function output(msg) {
        modalOutput.append(msg + '<br>');
    }



    /* FORMATTING METHODS FOR BBCODE AND HTML OUTPUT */

    function printBBCode(comingSoon, comingReallySoon) {
        var html = '<h3>Compartir</h3>' + '<textarea id="bbcode-area" class="form-control" style="resize: none;" cols=85 rows=10>';

        if (comingSoon.length) {
            html += '\n[SIZE=4][b]Disponibles en un futuro:[/b][/SIZE]\n\n';
            html += formatBBCode(comingSoon) + '\n';
        }

        if (comingReallySoon.length) {
            html += '\n[SIZE=4][b]Disponibles pronto:[/b][/SIZE]\n\n';
            html += formatBBCode(comingReallySoon) + '\n';
        }

        html += '</textarea>';

        /* Show a button to copy the content of the textarea if the browser supports it */
        if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
            html += '<button class="btn btn-success" style="width: 100%; margin-top: 5px;" onclick="document.querySelector(\'#bbcode-area\').select(); document.execCommand(\'copy\'); document.querySelector(\'#bbcode-area\').focus();">Copiar BBCode</button>';
        }
        output(html);
    }

    function formatBBCode(list) {
        var html = '';
        list.forEach(function (movie) {
            html += '[url="http://unogs.com/video/?v=' + movie.id + '"][img]' + movie.thumb + '[/img][/url]\n[url="http://www.netflix.com/title/' + movie.id + '"][b]' + movie.title + '[/b][/url]\n\n';
        });
        return html;
    }

    function printHTML(comingSoon, comingReallySoon) {
        if (comingSoon.length) {
            output('<h2>Disponibles en un futuro</h2>' + formatHTML(comingSoon));
        }

        if (comingReallySoon.length) {
            output('<h2>Disponibles pronto</h2>' + formatHTML(comingReallySoon));
        }
    }

    function formatHTML(list) {
        var html = '';
        list.forEach(function (movie) {
            html += '<div class="movie" style="display: inline-block; margin: 5px;" title="' + movie.title + '" alt="' + movie.title + '"><a href="http://unogs.com/video/?v=' + movie.id + '"><img class="movie-thumb" style="max-width: 100px;" src="' + movie.thumb + '"></img></a><br><a href="http://www.netflix.com/title/' + movie.id + '"><b class="movie-title" style="color: gray; display: inline-block; font-size: 12px; overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; width: 100px;">' + movie.title + '</b></a></div>';
        });
        return html;
    }

});
