const axios = require('axios');
require('./base')
const Sequelize = require('sequelize')
const { migrateLogTable } = require('./sequelizer');
const { Op } = require("sequelize");

var zd_job_api = '/api/v2/job_statuses/'

var counter = 0;

getJobList();

function getJobList () {
    console.log('====== GET JOB LIST =======')
    migrateLogTable.findAll({
        where: {
            status: 'PENDING'
        },
        attributes: [
            [Sequelize.fn('DISTINCT', Sequelize.col('batch_id')) ,'batch_id'],
            'status',
            'job_id',
        ]
    }).then(migrateLogs => {
        // console.log(migrateLogs);
        migrateLogs.forEach(migrateLog => {
            console.log('GET JOB: %s', migrateLog.dataValues.job_id);
            axios({
                method: 'GET',
                url: generateJobApi(destDomain, migrateLog.dataValues.job_id),
                auth: {
                    username: destUsername,
                    password: destPassword
                }
            }).then(function (response) {
                console.log('JOB ID: %s STATUS: %s', response.data.job_status.id, response.data.job_status.status)
                if (response.data.job_status.status == 'completed' || response.data.job_status.status == 'failed') {
                    response.data.job_status.results.forEach(result => {
                        var errorCause = '';
                        var status = 'COMPLETE'
                        var newTicketId = 0;
                        if (result.hasOwnProperty('error')) {
                            errorCause = result.details;
                            status = 'FAILED'
                        } else {
                            newTicketId = result.id;
                        }
                        
                        migrateLogTable.update({
                            status: status,
                            error_cause: errorCause,
                            new_ticket_id: newTicketId
                        }, {
                            where: {
                                [Op.and]: [
                                    {
                                        job_id: response.data.job_status.id
                                    },
                                    {
                                        ticket_index: result.index
                                    }
                                ]
                            }
                        })
                    });
                }
            });
        });
    })
}

function generateJobApi (domain, job_id) {
    return 'https://' + domain + '.zendesk.com'  + zd_job_api + job_id + '.json';
}