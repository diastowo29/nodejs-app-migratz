var express = require('express');
var router = express.Router();
var childProcess = require('child_process');

function runScript(scriptPath, callback) {
    var invoked = false;
    var process = childProcess.fork(scriptPath);

    process.on('error', function (err) {
        if (invoked) return;
        invoked = true;
        callback(err);
    });

    process.on('exit', function (code) {
        if (invoked) return;
        invoked = true;
        var err = code === 0 ? null : new Error('exit code ' + code);
        callback(err);
    });
}

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('migrator', { title: 'Migratz' });
});


/* GET users listing. */
router.get('/test', function(req, res, next) {
    // Now we can run a script and invoke a callback when complete, e.g.
    runScript('./test.js', function (err) {
        if (err) throw err;
        console.log('finished running some-script.js');
        res.render('migrator', { title: 'Migratz' });
    });

});

module.exports = router;