'use babel';
'use strict';
const Range = require('atom').Range;
const fuzzaldrin = require('fuzzaldrin');
const path = require('path');
const fs = require('fs');

module.exports = {
    id: 'autocomplete-paths-pathsprovider',
    selector: '*',
    wordRegex: /[a-zA-Z0-9\.\/_-]*\/[a-zA-Z0-9\.\/_-]*/g,

    getSuggestions(options) {
        var prefixForCursor = this.prefixForCursor.bind(this);
        return new Promise((resolve, reject) => {
            var basePath, editorPath, prefix, suggestions, _ref;
            if (options == null) {
                options = {};
            }
            if (options.editor === null || options.editor.buffer === null) {
                return resolve([]);
            }
            editorPath = (_ref = options.editor) != null ? _ref.getPath() : void 0;
            if (!(editorPath != null ? editorPath.length : void 0)) {
                return resolve([]);
            }
            basePath = path.dirname(editorPath);
            if (basePath == null) {
                return resolve([]);
            }
            if (!options.editor.cursors || options.editor.cursors.length !== 1) {
                return resolve([]);
            }
            prefix = prefixForCursor(options.editor, options.editor.buffer, options.editor.cursors[0], options.bufferPosition);
            if (!prefix.length) {
                return resolve([]);
            }
            this.findSuggestionsForPrefix(options.editor, basePath, prefix)
                .then((suggestions) => {
                    resolve(suggestions);
                })
                .catch((error) => {
                    return resolve([]);
                })
        });
    },

    prefixForCursor(editor, buffer, cursor, position) {
        var end, start;
        if (!((buffer != null) && (cursor != null))) {
            return '';
        }
        start = this.getBeginningOfCurrentWordBufferPosition(editor, position, {
            wordRegex: this.wordRegex
        });
        end = cursor.getBufferPosition();
        if (!((start != null) && (end != null))) {
            return '';
        }
        return buffer.getTextInRange(new Range(start, end));
    },

    getBeginningOfCurrentWordBufferPosition(editor, position, options) {
        var allowPrevious, beginningOfWordPosition, currentBufferPosition, scanRange, _ref;
        if (options == null) {
            options = {};
        }
        if (position == null) {
            return;
        }
        allowPrevious = (_ref = options.allowPrevious) != null ? _ref : true;
        currentBufferPosition = position;
        scanRange = [[currentBufferPosition.row, 0], currentBufferPosition];
        beginningOfWordPosition = null;
        editor.backwardsScanInBufferRange(options.wordRegex, scanRange, function(_arg) {
            var range, stop;
            range = _arg.range, stop = _arg.stop;
            if (range.end.isGreaterThanOrEqual(currentBufferPosition) || allowPrevious) {
                beginningOfWordPosition = range.start;
            }
            if (!(beginningOfWordPosition != null ? beginningOfWordPosition.isEqual(currentBufferPosition) : void 0)) {
                return stop();
            }
        });
        if (beginningOfWordPosition != null) {
            return beginningOfWordPosition;
        } else if (allowPrevious) {
            return [currentBufferPosition.row, 0];
        } else {
            return currentBufferPosition;
        }
    },

    findSuggestionsForPrefix(editor, basePath, prefix) {
        return new Promise((resolve, reject) => {
            var directory, files, prefixPath, results, stat, suggestionPromises;
            if (basePath == null) {
                return [];
            }
            prefixPath = path.resolve(basePath, prefix);
            if (prefix.endsWith('/')) {
                directory = prefixPath;
                prefix = '';
            } else {
                if (basePath === prefixPath) {
                    directory = prefixPath;
                } else {
                    directory = path.dirname(prefixPath);
                }
                prefix = path.basename(prefix);
            }
            fs.stat(directory, (error, stat) => {
                if (error) {
                    return reject(error);
                }
                if (!stat.isDirectory()) {
                    reject([]);
                }
                try {
                    files = fs.readdirSync(directory);
                } catch (error) {
                    return reject(error);
                }
                results = fuzzaldrin.filter(files, prefix);
                suggestionPromises = results.map((result) => {
                    return new Promise((resolve, reject) => {
                        const resultPath = path.resolve(directory, result);
                        fs.stat(resultPath, (error, stat) => {
                            if (error) {
                                return reject(error);
                            }
                            var label;
                            if (stat.isDirectory()) {
                                label = 'Dir';
                                result += path.sep;
                            } else if (stat.isFile()) {
                                label = 'File';
                            } else {
                                reject();
                            }
                            var suggestion = {
                                word: result,
                                prefix: prefix,
                                label: label,
                                data: {
                                    body: result
                                }
                            };
                            if (suggestion.label !== 'File') {
                                suggestion.onDidConfirm = function() {
                                    return atom.commands.dispatch(atom.views.getView(editor), 'autocomplete-plus:activate');
                                };
                            }
                            resolve(suggestion);
                        });
                    });
                });
                Promise.all(suggestionPromises)
                    .then((suggestions) => {
                        resolve(suggestions);
                    });
            });
        })
    },

    dispose() {
        this.editor = null;
        return this.basePath = null;
    },
};
