module.exports = function(grunt) {

    /* Grunt configuration. */
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        /* 1. Variable replacement into config.js file */
        replace: {
            target: {
                options: {
                    patterns: [
                        { match: 'version', replacement: '<%= pkg.version %>' },
                        {
                            match: 'mode',
                            replacement: function () {
                                return grunt.cli.tasks[0] === 'dist' ? 'PROD' : 'DEV';
                            }
                        }
                    ]
                },
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['config.js'],
                    dest: 'tmp/'
                }]
            }
        },

        /* 2. Merge the required files into the index.js */
        concat: {
            target: {
                src: ['tmp/config.js', 'src/helper.js', 'src/index.js'],
                dest: 'tmp/index.js'
            }
        },

        /* 3. Uglify and cssmin, just for production */
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> v<%= pkg.version %> ~ <%= grunt.template.today("yyyy-mm-dd") %> */\n',
                screwIE8: true,
                mangle: {
                    toplevel: true
                },
                compress: {}
            },
            target: {
                files: {
                    'tmp/index.min.js': 'tmp/index.js',
                    'tmp/netflix-module.min.js': 'src/netflix-module.js',
                    'tmp/providers-module.min.js': 'src/providers-module.js',
                }
            }
        },
        cssmin: {
            target: {
                files: {
                    'tmp/css/style.min.css': 'css/style.css'
                }
            }
        },

        /* 4. Copy all the temp files (minified, merged, etc.) to the target directory */
        copy: {
            dev: {
                files: [{
                    expand: true,
                    cwd: 'tmp/',
                    src: ['index.js'],
                    dest: 'dev/'
                },
                {
                    expand: true,
                    cwd: 'src/',
                    src: ['netflix-module.js', 'providers-module.js'],
                    dest: 'dev/'
                },
                {
                    expand: true,
                    cwd: 'css/',
                    src: ['style.css'],
                    dest: 'dev/css'
                }]
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: 'tmp/',
                    src: ['netflix-module.min.js', 'providers-module.min.js', 'index.min.js', 'css/style.min.css'],
                    dest: 'dist/'
                }]
            }
        },

        /* 5. Clean up the mess */
        clean: ['tmp/**'],



        /* The Bookmarklet Maker (tm) */
        bookmarklet_wrapper: {
            target: {
                files: {
                    'dist/bookmarklet.js': 'src/bookmarklet.js'
                }
            }
        },

        /* Watch, for development */
        watch: {
            scripts: {
                files: ['src/*'],
                tasks: ['replace', 'concat', 'copy:dev', 'clean']
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-bookmarklet-wrapper');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('default', ['replace', 'concat', 'copy:dev', 'clean']);
    grunt.registerTask('dist', ['replace', 'concat', 'uglify', 'cssmin', 'copy:dist', 'bookmarklet_wrapper', 'clean']);

};
