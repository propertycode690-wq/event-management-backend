const db = require('../db');
db.query("SELECT id, name, maxCapacity, deadline, address, description FROM Event WHERE id = 'evt-1'")
  .then(([rows]) => {
    console.log('EVENT EVT-1 DATA:', rows);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
