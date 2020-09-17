const axios = require('axios');
require('./base')
const { tfieldsTable } = require('./sequelizer');
const { Op } = require("sequelize");

var zd_ticketfields_api = '/api/v2/ticket_fields'

var fieldsDestApi = generateApi(destDomain) + zd_ticketfields_api + '.json';

collectFieldsList();

function collectFieldsList () {
    axios({
        method: 'GET',
        url: fieldsDestApi,
        auth: {
            username: destUsername,
            password: destPassword
        }
    }).then(function (response) {
        response.data.ticket_fields.forEach(ticket_field => {
            if (ticket_field.removable) {
                var urlDelete = generateApi(destDomain) + zd_ticketfields_api + '/' + ticket_field.id + '.json';
                // console.log(urlDelete)
                axios({
                    method: 'DELETE',
                    url: urlDelete,
                    auth: {
                        username: destUsername,
                        password: destPassword
                    }
                }).then(function (deleteResponse) {
                    console.log(deleteResponse.status)
                }).catch(function (error) {
                    console.log(error.response.data.details)
                    console.log('delete fields: %s error', ticket_field.title)
                })
            }
        });
    });
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}