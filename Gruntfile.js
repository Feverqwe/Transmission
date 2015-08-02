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
            output: [
                '<%= output %>/*',
                '!<%= output %>/hash'
            ],
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
        var getHash = function(path, cb) {
            var fs = require('fs');
            var crypto = require('crypto');

            var fd = fs.createReadStream(path);
            var hash = crypto.createHash('sha256');
            hash.setEncoding('hex');

            fd.on('end', function () {
                hash.end();
                cb(hash.read());
            });

            fd.pipe(hash);
        };

        var done = this.async();
        var ccTask = {
            closurecompiler: {
                minify: {
                    files: 'empty',
                    options: {
                        jscomp_warning: 'const',
                        language_in: 'ECMASCRIPT5',
                        max_processes: 2
                    }
                }
            }
        };
        grunt.config.merge(ccTask);
        ccTask.closurecompiler.minify.files = {};

        var wait = 0;
        var ready = 0;
        var hashList = {};

        var fs = require('fs');
        var ddblFolderList = [];
        ['dataJsFolder', 'libFolder'].forEach(function(folder) {
            if (ddblFolderList.indexOf(grunt.config(folder)) !== -1) {
                return;
            }
            ddblFolderList.push(grunt.config(folder));

            var jsFolder = grunt.template.process('<%= output %><%= vendor %><%= ' + folder + ' %>');

            var files = fs.readdirSync(jsFolder);
            var jsList = grunt.file.match('*.js', files);
            files = null;

            var copyList = [];
            var onReady = function() {
                ready++;
                if (wait !== ready) {
                    return;
                }

                var hashFolder = grunt.template.process('<%= output %>hash/');
                for (var hash in hashList) {
                    var item = hashList[hash];
                    var jsFolder = grunt.template.process('<%= output %><%= vendor %><%= ' + item[0] + ' %>');
                    var hashName = hashFolder + hash + '.js';
                    if (!grunt.file.exists(hashName)) {
                        ccTask.closurecompiler.minify.files[hashName] = '<%= output %><%= vendor %><%= ' + item[0] + ' %>'+item[1];
                    }
                    copyList.push([hashName, jsFolder + item[1]]);
                }

                grunt.config.merge(ccTask);
                grunt.registerTask('copyFromCache', function() {
                    copyList.forEach(function(item) {
                        grunt.file.copy(item[0], item[1]);
                    });
                });

                grunt.task.run(['closurecompiler:minify', 'copyFromCache']);

                done();
            };

            jsList.forEach(function(jsFile) {
                if (jsFile.indexOf('.min.js') !== -1) {
                    return;
                }
                wait++;
                getHash(jsFolder + jsFile, function(hash) {
                    hashList[hash] = [folder, jsFile];
                    onReady();
                });
            });
        });
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