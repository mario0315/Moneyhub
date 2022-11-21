const express = require("express");
const bodyParser = require("body-parser");
const config = require("config");
const request = require("request");
const { type } = require("ramda");
const axios = require("axios");
const fs = require("fs");
const { Parser } = require("json2csv");

const app = express();

app.use(bodyParser.json({ limit: "10mb" }));

app.get("/investments/:id", (req, res) => {
  const { id } = req.params;
  request.get(
    `${config.investmentsServiceUrl}/investments/${id}`,
    (e, r, investments) => {
      if (e) {
        console.error(e);
        res.send(500);
      } else {
        res.send(investments);
      }
    }
  );
});

app.get("/report", async (req, res) => {
  const response = await axios.get(
    `${config.investmentsServiceUrl}/investments`
  );
  const data = Object.values(response.data);

  let result = [];

  for (let item of data) {
    for (let holding of item.holdings) {
      const holdingData = await axios
        .get(`${config.financialCompanyUrl}/companies/${holding.id}`)
        .catch((e) => {
          console.error(e);
          res.send(500);
        });
      result.push({
        userId: item.userId,
        firstName: item.firstName,
        lastName: item.lastName,
        date: item.date,
        holding: holdingData.data.name,
        value: item.investmentTotal * holding.investmentPercentage,
      });
    }
  }

  const fields = [
    {
      label: "User ID",
      value: "userId",
    },
    {
      label: "First Name",
      value: "firstName",
    },
    {
      label: "Last Name",
      value: "lastName",
    },
    {
      label: "Date",
      value: "date",
    },
    {
      label: "Holding",
      value: "holding",
    },
    {
      label: "Value",
      value: "value",
    },
  ];
  const csv = new Parser({ fields });
  fs.writeFile("report.csv", csv.parse(result), function (err) {
    if (err) {
      console.error(err);
      throw err;
    }
    console.log("file saved");
  });
  axios.post(
    `${config.investmentsServiceUrl}/investments/export`,

    result
  );
  res.send(result);
});

app.listen(config.port, (err) => {
  if (err) {
    console.error("Error occurred starting the server", err);
    process.exit(1);
  }
  console.log(`Server running on port ${config.port}`);
});
