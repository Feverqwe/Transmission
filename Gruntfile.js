module.exports = function (grunt) {
    var bgJsList = [
        'background.js'
    ];
    var dataJsList = [
        'mono.js',
        'manager.js',
        'notifer.js',
        'graph.js',
        'options.js',
        'selectBox.js',
        'jquery-2.1.3.min.js',
        'jquery.contextMenu.js',
        'd3.min.js',
        'bootstrap-colorpicker.js'
    ];
    grunt.initConfig({
        env: grunt.file.exists('env.json') ? grunt.file.readJSON('env.json') : {},
        pkg: grunt.file.readJSON('package.json'),
        clean: {
            output: '<%= output %>',
            builds: [
                'build_firefox.xpi'
            ]
        },
        copy: {
            background: {
                cwd: 'src/js/',
                expand: true,
                src: bgJsList,
                dest: '<%= output %><%= vendor %><%= libFolder %>'
            },

            dataJs: {
                cwd: 'src/js/',
                expand: true,
                src: dataJsList,
                dest: '<%= output %><%= vendor %><%= dataJsFolder %>'
            },

            locales: {
                cwd: 'src/',
                expand: true,
                src: '_locales/**',
                dest: '<%= output %><%= vendor %><%= dataFolder %>'
            },

            baseData: {
                cwd: 'src/',
                expand: true,
                src: [
                    'css/**',
                    'images/**',
                    'manager.html',
                    'options.html'
                ],
                dest: '<%= output %><%= vendor %><%= dataFolder %>'
            }
        },

        // vars
        root: process.cwd().replace(/\\/g, '/') + '/',
        output: '<%= pkg.outputDir %>'
    });

    grunt.registerTask('compressJs', function() {
        var jsList = dataJsList.concat(bgJsList);

        var ccTask = {
            closurecompiler: {
                minify: {
                    files: {},
                    options: {
                        jscomp_warning: 'const',
                        language_in: 'ECMASCRIPT5',
                        max_processes: 2
                    }
                }
            }
        };

        for (var i = 0, jsFile; jsFile = jsList[i]; i++) {
            if (jsFile.indexOf('.min.js') !== -1) continue;

            var jsFolderType = (bgJsList.indexOf(jsFile) !== -1) ? 'libFolder' : 'dataJsFolder';

            ccTask.closurecompiler.minify.files['<%= output %><%= vendor %><%= '+jsFolderType+' %>'+jsFile] = '<%= output %><%= vendor %><%= '+jsFolderType+' %>'+jsFile;
        }

        grunt.config.merge(ccTask);
        grunt.task.run('closurecompiler:minify');
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-json-format');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-closurecompiler');

    grunt.registerTask('extensionBase', ['copy:background', 'copy:dataJs', 'copy:baseData', 'copy:locales']);

    require('./grunt/chrome.js').run(grunt);
    require('./grunt/firefox.js').run(grunt);

    grunt.registerTask('staticMono', function () {
        grunt.loadNpmTasks('grunt-jsbeautifier');
        grunt.config.merge({
            jsbeautifier: {
                monoChrome: {
                    src: ['<%= monoChrome %>']
                },
                monoFirefox: {
                    src: ['<%= monoFirefox %>']
                }
            },
            monoChrome: 'src/vendor/chrome/js/' + 'mono.js',
            monoFirefox: 'src/vendor/firefox/data/js/' + 'mono.js'
        });
        var monoModule = require('mono');
        var content;

        content = monoModule.get.mono('oldChrome');
        grunt.file.write(grunt.template.process(grunt.config('monoChrome')), content);

        content = monoModule.get.mono('firefox');
        grunt.file.write(grunt.template.process(grunt.config('monoFirefox')), content);

        grunt.task.run(['jsbeautifier:monoChrome', 'jsbeautifier:monoFirefox']);
    });

    grunt.registerTask('default', [
        'clean:output',
        'clean:builds',
        'chrome',
        'opera',
        'firefox'
    ]);
};