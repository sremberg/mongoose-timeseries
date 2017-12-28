var assert = require('chai').assert;
var MTI = require('../');
var moment = require('moment');
var test_mongoose = require('./test-mongoose.js');
var mti;

//mongoose.connect('mongodb://localhost/mti');
//mongoose.connection.on('error', console.error.bind(console, 'connection error:'))

describe('minutes -', function () {

    before(function (done) {

        test_mongoose().then(function (mongoose) {
            mti = new MTI(mongoose, 'minutes', {interval: 60, verbose: false});
            mti.model.remove({}, function () {
                done();
            });
        }).catch((err) => assert.fail())
    });

    it('init', function (done) {
        var schema = mti.getSchema();
        var model = mti.getModel();

        assert.typeOf(schema, 'object');
        assert.typeOf(model, 'function');
        assert.equal(model.modelName, 'minutes');
        assert.typeOf(schema.path('hourly'), 'object');
        assert.typeOf(schema.path('minutes'), 'object');

        mti.model.count({}, function (e, c) {
            assert.typeOf(e, 'null');
            assert.equal(c, 0);
            done();
        });

    });

    it('pushes', function (done) {
        this.timeout(60000);
        var loop = function (i, count, cb) {
            if (i < count) {
                var hour = 12 + Math.floor(i / 60);
                var min = i % 60;
                //console.log('Time: '+hour+':'+min);
                mti.push(moment.utc(Date.UTC(2013, 6, 16, hour, min)),
                    i,
                    {test: i},
                    false,
                    function (error, doc) {

                        //console.log(error);
                        //console.log(doc);
                        assert.typeOf(error, 'null');
                        assert.typeOf(doc, 'object');
                        assert.typeOf(doc.minutes, 'array');
                        assert.equal(doc.day.getTime(), new Date(2013, 6, 16).getTime());
                        assert.equal(doc.latest.value, i, 'Latest');
                        assert.equal(doc.statistics.count, i + 1);
                        assert.equal(doc.minutes[hour][min].value, i, 'current');

                        //assert.equal( Object.keys(doc.hourly).length, i+1, 'hourly length');

                        //console.log('Loop '+i+' OK.');

                        loop(i + 1, count, cb);

                    });
            } else {
                //setInterval( cb, 1000 );
                cb();
            }
        }
        loop(0, 360, function () { //every minute between 0...359
            done();
        });
    });

    it('doc post process', function (done) {
        mti.model.recalc(moment.utc(Date.UTC(2013, 6, 16)), 0, function () {
            done();
        });
    });

    it('doc summary', function (done) {
        //collection
        mti.model.find({}, function (e, docs) {
            assert.typeOf(e, 'null');
            assert.typeOf(docs, 'array');
            assert.equal(docs.length, 1);
            //console.log('stats: '+JSON.stringify(docs[0].statistics));
            assert.typeOf(docs[0], 'object');
            assert.typeOf(docs[0].statistics, 'object');
            assert.equal(docs[0].statistics.count, 360);
            assert.equal(docs[0].statistics.min.value, 0);
            assert.equal(docs[0].statistics.max.value, 359);
            assert.equal(docs[0].statistics.sum / docs[0].statistics.count, 179.5);
            // assert.equal(docs[0].statistics.avg, 179.5);
            done();
        });
    });

    it('findMin', function (done) {
        //collection
        mti.findMin({
            from: moment.utc(Date.UTC(2013, 6, 16)),
            to: moment.utc(Date.UTC(2013, 6, 16))
        }, function (e, min) {
            assert.typeOf(e, 'null');
            assert.equal(min.value, 0);
            done();
        })
    });

    it('findMax', function (done) {
        //collection
        mti.findMax({
            from: moment.utc(Date.UTC(2013, 6, 16)),
            to: moment.utc(Date.UTC(2013, 6, 16))
        }, function (e, max) {
            assert.typeOf(e, 'null');
            assert.equal(max.value, 359);
            done();
        })
    });
});
