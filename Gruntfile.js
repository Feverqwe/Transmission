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
        'd3.min.js'
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
                    'css/*',
                    'images/*',
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

    var compressJsCopyTaskList = [];
    grunt.registerTask('compressJs', function() {
        if (compressJsCopyTaskList.length > 0) {
            grunt.task.run(compressJsCopyTaskList);
            return;
        }

        var jsList = dataJsList.concat(bgJsList);
        var copyTask = {
            copy: {}
        };

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
            var cacheSubFolder = jsFolderType + '/';

            var cacheDir = grunt.config('output') + 'cache/' + cacheSubFolder;
            !grunt.file.exists(cacheDir) && grunt.file.mkdir(cacheDir);

            copyTask.copy['minify_file_'+jsFile] = {
                flatten: true,
                src: cacheDir+jsFile,
                dest: '<%= output %><%= vendor %>'+'<%= '+jsFolderType+' %>'+jsFile
            };

            ccTask.closurecompiler.minify.files[cacheDir+jsFile] = '<%= output %><%= vendor %><%= '+jsFolderType+' %>'+jsFile;
        }

        grunt.config.merge(copyTask);
        for (var taskName in copyTask.copy) {
            compressJsCopyTaskList.push('copy:' + taskName);
        }

        grunt.config.merge(ccTask);
        grunt.task.run('closurecompiler:minify');

        grunt.task.run(compressJsCopyTaskList);
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-json-format');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-closurecompiler');

    require('./grunt/mono.js').run(grunt);

    grunt.registerTask('extensionBase', ['copy:background', 'copy:dataJs', 'mono', 'copy:baseData', 'copy:locales']);
    grunt.registerTask('extensionBaseMin', ['extensionBase', 'compressJs']);

    require('./grunt/chrome.js').run(grunt);
    require('./grunt/firefox.js').run(grunt);

    grunt.registerTask('default', [
        'clean:output',
        'clean:builds',
        'chrome',
        'opera',
        'firefox'
    ]);
};