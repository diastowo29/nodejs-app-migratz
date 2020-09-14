const axios = require('axios');
require('./base')
const { tfieldsTable } = require('./sequelizer');
const { Op } = require("sequelize");

var zd_ticketfields_api = '/api/v2/ticket_fields.json'

var fieldsOriginApi = generateApi(originDomain) + zd_ticketfields_api;
var fieldsDestApi = generateApi(destDomain) + zd_ticketfields_api;

var counter = 0;

collectFieldsList();

function collectFieldsList () {
    axios({
        method: 'GET',
        url: fieldsOriginApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {

        var originFieldsDone = new Promise((resolve, reject) => {
            response.data.ticket_fields.forEach(async (field) => {
                await insertOrUpdateFields(field);
                counter++;
                if (counter === response.data.ticket_fields.length) {
                    counter = 0;
                    resolve()
                }
            });
        });

        originFieldsDone.then(() => {
            axios({
                method: 'GET',
                url: fieldsDestApi,
                auth: {
                    username: destUsername,
                    password: destPassword
                }
            }).then(function (response) {
                var destFieldsDone = new Promise((resolve, reject) => {
                    response.data.ticket_fields.forEach(async (field) => {
                        await compareFields(field);
                        counter++;
                        if (counter === response.data.ticket_fields.length) {
                            counter = 0;
                            resolve()
                        }
                    });
                });

                destFieldsDone.then(() => {
                    // console.log('===== all is done =====')
                    doReplicateFields();
                });
            });
        });
    });
}

function doReplicateFields () {
    axios({
        method: 'GET',
        url: fieldsOriginApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {
        tfieldsTable.findAll({
            where: {
                destination_tfields_id: 0
            }
        }).then(tfields_found => {
            if (tfields_found !== null) {
                tfields_found.forEach(fieldsZero => {
                    response.data.ticket_fields.forEach(async (originFields) => {
                        if (fieldsZero.dataValues.origin_tfields_id == originFields.id) {
                            createFields(originFields)
                        }
                    });
                });
            }
        })
    })
}

function insertOrUpdateFields (field) {
    return tfieldsTable.findOne({
        where: {
            origin_tfields_id: field.id
        }
    }).then(tfieldsTableFound => {
        if (tfieldsTableFound === null) {
            return tfieldsTable.create({
                origin_tfields_id: field.id,
                origin_tfields_name: field.title,
                destination_tfields_id: 0,
                destination_tfields_name: ''
            })
        } else {
            return tfieldsTable.update({
                origin_tfields_name: field.title,
                destination_tfields_id: 0,
                destination_tfields_name: ''
            },{
                where: {
                    origin_tfields_id: field.id,
                }
            })
        }
    })
}

async function compareFields (field) {
    return tfieldsTable.findOne({
        where: {
            [Op.or]: [
                {
                    origin_tfields_name: field.title
                },
                {
                    origin_tfields_name: originDomain + ' - '  + field.title
                }
            ]
        }
    }).then(tfieldsTableFound => {
        if (tfieldsTableFound !== null) {
            return tfieldsTable.update({
                destination_tfields_name: field.title,
                destination_tfields_id: field.id
            },{
                where: {
                    origin_tfields_id: tfieldsTableFound.dataValues.origin_tfields_id,
                }
            })
        }
    })
}

async function createFields (field) {
    field.title = originDomain + ' - ' + field.title
    return axios({
        method: 'POST',
        url: fieldsDestApi,
        auth: {
            username: destUsername,
            password: destPassword
        },
        data: {
            ticket_field: field
        }
    }).then(function (response) {
        console.log('CREATE FIELD: %s on %s', field.title, fieldsDestApi);
        console.log(response.status)
        // return response
        updateFieldsDb(response, field.id, field.title);
    }).catch(error => {
        console.log('ERROR CREATE FIELD: %s on %s', field.title, fieldsDestApi);
        console.log(error.response)
        // return error.response
        updateFieldsDb(error.response, field.id, field.title);
    });
}

function updateFieldsDb (response, id, title) {
    tfieldsTable.findOne({
        where: {
            origin_tfields_id: id
        }
    }).then(tfieldsTableFound => {
        var createdFieldsId = 0;
        var createdFieldsTitle = '';
        var errorCause = '';

        if (response.status == 200 || response.status == 201) {
            createdFieldsId = response.data.ticket_field.id;
            createdFieldsTitle = response.data.ticket_field.title;
        } else {
            if (response.data.hasOwnProperty('details')) {
                errorCause = response.data.details.base[0].description 
                || response.data.details.toString();
            } else {
                errorCause = response.data.description;
            }
        }

        if (tfieldsTableFound === null) {
            tfieldsTable.create({
                origin_tfields_id: id,
                origin_tfields_name: title,
                destination_tfields_id: createdFieldsId,
                destination_tfields_name: createdFieldsTitle,
                status: response.status.toString(),
                error_cause: errorCause
            })
        } else {
            tfieldsTable.update({
                destination_tfields_id: createdFieldsId,
                destination_tfields_name: createdFieldsTitle,
                status: response.status.toString(),
                error_cause: errorCause
            },{
                where: {
                    origin_tfields_id: tfieldsTableFound.origin_tfields_id,
                }
            })
        }
    })
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}