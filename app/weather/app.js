const AWS = require('aws-sdk');

const getAwsSecret = require('/opt/nodejs/helper').getAwsSecret;
const responseFactory = require('/opt/nodejs/helper').responseFactory;
const headerValid = require('/opt/nodejs/helper').headerValid;
const mapURI = "http://api.openweathermap.org/data/2.5";
const ENV = process.env.Env;
const APP_NAME= process.env.AppName;
const targetCity = process.env.TARGET_CITY || "Helsinki,fi";
const fetch = require('node-fetch');


const fetchWeather = async (apiKey) => {
    const endpoint = `${mapURI}/weather?q=${targetCity}&appid=${apiKey}&units=metric`;
    const response = await fetch(endpoint);  
    return response ? response.json() : {}
  };


exports.handler = async (event, context) => {


    try {
        const secret = await getAwsSecret(`${APP_NAME}-${ENV}`)
        const weatherData = await fetchWeather(JSON.parse(secret.SecretString).ApiKey);
        console.log('got this weather data ', weatherData)

        return responseFactory(200, weatherData);

    } catch (err) {
        console.log(err)
        return responseFactory(500, err);
    }

};