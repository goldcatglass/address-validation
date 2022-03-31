module.exports = {
  getMatchFromUPSResponse: (addressIndicator, addressKeyFormat, request_body) => {
    if (
      addressIndicator &&
      (request_body.line1[0] || '').toLowerCase() === (addressKeyFormat.AddressLine[0] || '').toLowerCase() &&
      (request_body.line2[0] || '').toLowerCase() === (addressKeyFormat.AddressLine[1] || '').toLowerCase() &&
      (request_body.state[0] || '').toLowerCase() === (addressKeyFormat.PoliticalDivision1[0] || '').toLowerCase() &&
      (request_body.city[0] || '').toLowerCase() === (addressKeyFormat.PoliticalDivision2[0] || '').toLowerCase() &&
      (request_body.zip[0] || '').toLowerCase() === (addressKeyFormat.PostcodePrimaryLow[0] || '').toLowerCase()
    ) {
      return 'Match';
    } else if (
      request_body.state[0] !== addressKeyFormat.PoliticalDivision1[0] ||
      (request_body.city[0] || '').toLowerCase() !== (addressKeyFormat.PoliticalDivision2[0] || '').toLowerCase() ||
      (request_body.zip[0] || '').toLowerCase() !== (addressKeyFormat.PostcodePrimaryLow[0] || '').toLowerCase()
    ) {
      return 'Mismatch';
    } else if ((request_body.line1[0] || '').toLowerCase() !== (addressKeyFormat.AddressLine[0] || '').toLowerCase()) {
      return 'Line1 Mismatch';
    } else if ((request_body.line2[0] || '').toLowerCase() !== (addressKeyFormat.AddressLine[1] || '').toLowerCase()) {
      return 'Line2 Mismatch';
    }
  }
}