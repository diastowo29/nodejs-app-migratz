const axios = require('axios');
require('./base')
const { tfieldsTable, tformsTable } = require('./sequelizer');
const { Op } = require("sequelize");

var zd_ticketforms_api = '/api/v2/ticket_forms.json'

var formsOriginApi = generateApi(originDomain) + zd_ticketforms_api;
var formsDestApi = generateApi(destDomain) + zd_ticketforms_api;

var counter = 0;

collectFormsList();

function collectFormsList () {
    axios({
        method: 'GET',
        url: formsOriginApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {

        var originFormsDone = new Promise((resolve, reject) => {
            response.data.ticket_forms.forEach(async (form) => {
                await insertOrUpdateFields(form);
                counter++;
                if (counter === response.data.ticket_forms.length) {
                    counter = 0;
                    resolve()
                }
            });
        });

        originFormsDone.then(() => {
            axios({
                method: 'GET',
                url: formsDestApi,
                auth: {
                    username: destUsername,
                    password: destPassword
                }
            }).then(function (response) {
                var destFormsDone = new Promise((resolve, reject) => {
                    response.data.ticket_forms.forEach(async (form) => {
                        await compareForms(form);
                        counter++;
                        if (counter === response.data.ticket_forms.length) {
                            counter = 0;
                            resolve()
                        }
                    });
                });

                destFormsDone.then(() => {
                    // console.log('===== all is done =====')
                    doReplicateForms();
                });
            });
        });
    });
}

function doReplicateForms () {
    axios({
        method: 'GET',
        url: formsOriginApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {
        tformsTable.findAll({
            where: {
                destination_tforms_id: 0
            }
        }).then(tforms_found => {
            if (tforms_found !== null) {
                tforms_found.forEach(formsZero => {
                    response.data.ticket_forms.forEach(async (originForms) => {
                        if (formsZero.dataValues.origin_tforms_id == originForms.id) {
                            // if (formsZero.dataValues.origin_tforms_id == 351647) {
                                manipulateForm(originForms)
                            // }
                        }
                    });
                });
            }
        })
    })
}

function insertOrUpdateFields (form) {
    return tformsTable.findOne({
        where: {
            origin_tforms_id: form.id
        }
    }).then(tformsTableFound => {
        if (tformsTableFound === null) {
            return tformsTable.create({
                origin_tforms_id: form. id,
                origin_tforms_name: form.name,
                origin_tforms_active: form.active,
                destination_tforms_id: 0,
                destination_tforms_name: ''
            })
        } else {
            return tformsTable.update({
                origin_tforms_name: form.name,
                origin_tforms_active: form.active,
                destination_tforms_id: 0,
                destination_tforms_name: ''
            },{
                where: {
                    origin_tforms_id: form.id,
                }
            })
        }
    })
}

async function compareForms (form) {
    return tformsTable.findOne({
        where: {
            [Op.or]: [
                {
                    origin_tforms_name: form.name
                },
                {
                    origin_tforms_name: originDomain + ' - '  + form.name
                }
            ]
        }
    }).then(tformsTableFound => {
        if (tformsTableFound !== null) {
            return tformsTable.update({
                destination_tforms_name: form.name,
                destination_tforms_id: form.id
            },{
                where: {
                    origin_tforms_id: tformsTableFound.dataValues.origin_tforms_id,
                }
            })
        }
    })
}

async function manipulateForm (form) {
    form.name = originDomain + ' - ' + form.name;

    tfieldsTable.findAll().then(tfields_all => {
        form.ticket_field_ids.forEach((formFieldIds, formFieldIndex) => {
            tfields_all.forEach(fieldsDb => {
                if (formFieldIds == fieldsDb.dataValues.origin_tfields_id) {
                    form.ticket_field_ids[formFieldIndex] = parseInt(fieldsDb.dataValues.destination_tfields_id)
                }
            });
        });

        form.end_user_conditions.forEach((condition, index) => {
            form.end_user_conditions[index].parent_field_id = mappingIds(all_origin_fields, condition.parent_field_id);
            if (condition.child_fields.length > 0) {
                condition.child_fields.forEach((conditionChild, childIndex) => {
                    form.end_user_conditions[index].child_fields[childIndex].id = mappingIds(all_origin_fields, conditionChild.id);
                });
            }
        });

        form.agent_conditions.forEach((condition, index) => {
            form.agent_conditions[index].parent_field_id = mappingIds(all_origin_fields, condition.parent_field_id);
            if (condition.child_fields.length > 0) {
                condition.child_fields.forEach((conditionChild, childIndex) => {
                    form.agent_conditions[index].child_fields[childIndex].id = mappingIds(all_origin_fields, conditionChild.id);
                });
            }
        });
        createDestForm(form)
    })
}

function mappingIds (ticket_fields, originFieldId) {
    var id;
    ticket_fields.forEach(field => {
        if (originFieldId == field.origin_tfields_id) {
            id =  field.destination_tfields_id;
        }
    });
    return id;
}

function createDestForm (form) {
    console.log('CREATE FORM : %s', form.name)
    axios({
        method: 'POST',
        url: formsDestApi,
        auth: {
            username: destUsername,
            password: destPassword
        },
        data: {
            ticket_form: form
        }
    }).then(function (response) {
        console.log('CREATE FORM: %s on %s', form.name, formsDestApi);
        console.log(response.status)
        updateFormDb(response, form.id, form.name);
    }).catch(error => {
        console.log('ERROR CREATE FORM: %s on %s', form.name, formsDestApi);
        console.log(error.response)
        updateFormDb(error.response, form.id, form.name);
    });
}

function updateFormDb (response, id, name) {
    tformsTable.findOne({
        where: {
            origin_tforms_id: id
        }
    }).then(tformsTableFound => {
        var createdFormsId = 0;
        var createdFormsName = '';
        var errorCause = '';

        if (response.status == 200 || response.status == 201) {
            createdFormsId = response.data.ticket_form.id;
            createdFormsName = response.data.ticket_form.name;
        } else {
            if (response.data.hasOwnProperty('details')) {
                errorCause = response.data.details.base[0].description 
                || response.data.details.toString();
            } else {
                errorCause = response.data.description;
            }
        }

        if (tformsTableFound === null) {
            tformsTable.create({
                origin_tforms_id: id,
                origin_tforms_name: name,
                destination_tforms_id: createdFormsId,
                destination_tforms_name: createdFormsName,
                status: response.status.toString(),
                error_cause: errorCause
            })
        } else {
            tformsTable.update({
                destination_tforms_id: createdFormsId,
                destination_tforms_name: createdFormsName,
                status: response.status.toString(),
                error_cause: errorCause
            },{
                where: {
                    origin_tforms_id: tformsTableFound.origin_tforms_id,
                }
            })
        }
    })
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}