require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const logger = require('morgan');
const cors = require('cors');
const xmlparser = require('express-xml-bodyparser');
const axios = require('axios').default;
const xml2js = require('xml2js');
const { User, SiteReference } = require('./db/models');
const bcrypt = require('bcrypt');

const app = express();

app.use(cors('*'));
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
  try {
    const auth = req.headers['authorization'].split(' ')[1];
    const decrypted = Buffer.from(auth, 'base64').toString().split(':');
    const username = decrypted[0];
    const password = decrypted[1];
    const user = await User.findOne({
      where: {
        username: username,
      },
    });

    const hash = user.password.replace(/^\$2y(.+)$/i, '$2a$1');
    bcrypt.compare(password, hash, function (err, result) {
      if (err || !result) {
        res.status(401).json({
          authorized: false,
        });
      } else {
        next();
      }
    });
  } catch (e) {
    console.log(e);
    res.status(401).json({
      authorized: false,
    });
  }
});

app.use(xmlparser());


app.post('/address/validation', async (req, res) => {
  try {
    const body = req.body.avrequest;
    const request_body = `<?xml version="1.0"?>
    <AccessRequest xml:lang="en-US">
        <AccessLicenseNumber>ADB3CD33DFEB7AD2</AccessLicenseNumber>
        <UserId>yaya4380</UserId>
        <Password>Yaya1234$$</Password>
    </AccessRequest>
    <?xml version="1.0"?>
    <AddressValidationRequest xml:lang="en-US">
       <Request>
          <TransactionReference>
             <CustomerContext>Customer Data</CustomerContext>
             <XpciVersion>1.0001</XpciVersion>
          </TransactionReference>
          <RequestAction>XAV</RequestAction>
          <RequestOption>3</RequestOption>
       </Request>
       ${body.maxsuggestion ? '<MaximumListSize>' + body.maxsuggestion[0] + '</MaximumListSize>' : ''}
       <AddressKeyFormat>
          ${body.line1 ? '<AddressLine>' + body.line1[0] + '</AddressLine>' : ''}
          ${body.line2 ? '<AddressLine>' + body.line2[0] + '</AddressLine>' : ''}
          <PoliticalDivision2>${body.city[0]}</PoliticalDivision2>
          <PoliticalDivision1>${body.state[0]}</PoliticalDivision1>
          <PostcodePrimaryLow>${body.zip[0]}</PostcodePrimaryLow>
          <CountryCode>${body.country[0]}</CountryCode>
       </AddressKeyFormat>
    </AddressValidationRequest>`;
    const { data } = await axios.post('https://onlinetools.ups.com/ups.app/xml/XAV', request_body, {
      headers: {
        'Content-Type': 'text/plan',
      },
    });

    const site_reference = await SiteReference.findOne({
      where: {
        site_name: 'Google'
      }
    });
    let fulladdress = `${body.line1[0] || ''}+${body.line2[0] || ''}+${body.city[0] || ''}+${body.state[0] || ''}+${body.zip[0] || ''}+${body.country[0] || ''}`;
    while (fulladdress.match(/\+\+| |  /gi)) fulladdress = fulladdress.replace(/\+\+| |  /gi, '+');
    let result = await axios.get(`${site_reference.site_url}/maps/api/geocode/json?address=${fulladdress}&key=${site_reference.site_password}`);

    const request_geo = result.data.results[0].geometry?.location;

    xml2js.parseString(data, async (e, result) => {
      const resultStatus = result.AddressValidationResponse.Response[0].ResponseStatusCode[0] == '1' ? 'True' : 'False';
      const addressIndicator = result.AddressValidationResponse.ValidAddressIndicator
        ? 'Valid'
        : result.AddressValidationResponse.AmbiguousAddressIndicator
        ? 'Ambiguou'
        : 'Invalid';
      const addressClassification = result.AddressValidationResponse.AddressClassification[0].Description[0];
      const addressKeyFormats = await Promise.all((result.AddressValidationResponse.AddressKeyFormat || []).map(async (addressKeyFormat) => {
        var match = null, geometry = null;
        if (
          result.AddressValidationResponse.ValidAddressIndicator &&
          (body.line1[0] || '').toLowerCase() === (addressKeyFormat.AddressLine[0] || '').toLowerCase() &&
          (body.line2[0] || '').toLowerCase() === (addressKeyFormat.AddressLine[1] || '').toLowerCase() &&
          (body.state[0] || '').toLowerCase() === (addressKeyFormat.PoliticalDivision1[0] || '').toLowerCase() &&
          (body.city[0] || '').toLowerCase() === (addressKeyFormat.PoliticalDivision2[0] || '').toLowerCase() &&
          (body.zip[0] || '').toLowerCase() === (addressKeyFormat.PostcodePrimaryLow[0] || '').toLowerCase()
        ) {
          match = 'Match';
        } else if (
          body.state[0] !== addressKeyFormat.PoliticalDivision1[0] ||
          (body.city[0] || '').toLowerCase() !== (addressKeyFormat.PoliticalDivision2[0] || '').toLowerCase() ||
          (body.zip[0] || '').toLowerCase() !== (addressKeyFormat.PostcodePrimaryLow[0] || '').toLowerCase()
        ) {
          match = 'Mismatch';
        } else if ((body.line1[0] || '').toLowerCase() !== (addressKeyFormat.AddressLine[0] || '').toLowerCase()) {
          match = 'Line1 Mismatch';
        } else if ((body.line2[0] || '').toLowerCase() !== (addressKeyFormat.AddressLine[1] || '').toLowerCase()) {
          match = 'Line2 Mismatch';
        }

        if (match !== 'Match' && addressIndicator === 'Valid') {
          fulladdress = `${addressKeyFormat.AddressLine[0] || ''}+${addressKeyFormat.AddressLine[1] || ''}+${addressKeyFormat.PoliticalDivision2[0] || ''}+${addressKeyFormat.PoliticalDivision1[0] || ''}+${addressKeyFormat.PostcodePrimaryLow[0] || ''}+${addressKeyFormat.CountryCode[0] || ''}`;
          while (fulladdress.match(/\+\+| |  /gi)) fulladdress = fulladdress.replace(/\+\+| |  /gi, '+');
          const response = await axios.get(`${site_reference.site_url}/maps/api/geocode/json?address=${fulladdress}&key=${site_reference.site_password}`);
          geometry = response.data.results[0].geometry?.location;
          if (geometry?.lat === request_geo?.lat && geometry?.lng === request_geo?.lng) match = 'Match';
        }
        if (geometry) {
          return `<addressMatch>${match}</addressMatch>` + 
            `<suggestedAddress>` + 
              `<line1>${addressKeyFormat.AddressLine[0] || ''}</line1>` + 
              `<line2>${addressKeyFormat.AddressLine[1] || ''}</line2>` + 
              `<line3>${addressKeyFormat.AddressLine[2] || ''}</line3>` + 
              `<city>${addressKeyFormat.PoliticalDivision2[0] || ''}</city>` + 
              `<state>${addressKeyFormat.PoliticalDivision1[0] || ''}</state>` + 
              `<zip>${addressKeyFormat.PostcodePrimaryLow[0] || ''}</zip>` + 
              `<country>${addressKeyFormat.CountryCode[0] || ''}</country>` + 
              `<latitude>${geometry?.lat || ''}</latitude>` + 
              `<longitude>${geometry?.lng || ''}</longitude>` + 
            `</suggestedAddress>`;
        } else if (request_geo && match === 'Match') {
          return `<addressMatch>${match}</addressMatch>` + 
            `<suggestedAddress>` + 
              `<line1>${addressKeyFormat.AddressLine[0] || ''}</line1>` + 
              `<line2>${addressKeyFormat.AddressLine[1] || ''}</line2>` + 
              `<line3>${addressKeyFormat.AddressLine[2] || ''}</line3>` + 
              `<city>${addressKeyFormat.PoliticalDivision2[0] || ''}</city>` + 
              `<state>${addressKeyFormat.PoliticalDivision1[0] || ''}</state>` + 
              `<zip>${addressKeyFormat.PostcodePrimaryLow[0] || ''}</zip>` + 
              `<country>${addressKeyFormat.CountryCode[0] || ''}</country>` + 
              `<latitude>${request_geo?.lat || ''}</latitude>` + 
              `<longitude>${request_geo?.lng || ''}</longitude>` + 
            `</suggestedAddress>`;
        } else {
          return `<addressMatch>${match}</addressMatch>` + 
            `<suggestedAddress>` + 
              `<line1>${addressKeyFormat.AddressLine[0] || ''}</line1>` + 
              `<line2>${addressKeyFormat.AddressLine[1] || ''}</line2>` + 
              `<line3>${addressKeyFormat.AddressLine[2] || ''}</line3>` + 
              `<city>${addressKeyFormat.PoliticalDivision2[0] || ''}</city>` + 
              `<state>${addressKeyFormat.PoliticalDivision1[0] || ''}</state>` + 
              `<zip>${addressKeyFormat.PostcodePrimaryLow[0] || ''}</zip>` + 
              `<country>${addressKeyFormat.CountryCode[0] || ''}</country>` + 
            `</suggestedAddress>`;
        }
      }));

      const response = `<?xml version="1.0" encoding="UTF-8"?><avResponse>` + 
          `<summary>` + 
              `<requestStatus>${resultStatus}</requestStatus>` + 
              `<addressIndicator>${addressIndicator}</addressIndicator>` + 
              `<addressClassification>${addressClassification}</addressClassification>` + 
              addressKeyFormats.join('') + 
          `</summary>` + 
          `<upsResponse>${data.split('<?xml version="1.0"?>').join('')}</upsResponse>` + 
        `</avResponse>`;
      res.set('Content-Type', 'application/xml').send(response);
    });
  } catch (e) {
    console.log(e);
    res.json({ e });
  }
});

app.use(function (_, __, next) {
  next(createError(404));
});

app.use((err, _, res, __) => {
  const message = err.message;
  res.status(err.status || 500).json({ message });
});

const normalizePort = (val) => parseInt(val, 10);

const port = normalizePort(process.env.APP_PORT || '3000');
app.set('port', port);

app.listen(port, () => {
  console.log('Express server is running on ' + port);
  require('./db/models');
});
