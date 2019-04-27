const fs = require('fs-extra');
const xml2js = require('xml2js');

const parser = new xml2js.Parser({
  explicitRoot: false,
  mergeAttrs: true,
  charkey: 'content'
});

const codeSnifferPath = 'PHP_CodeSniffer';
const standardsPath = `${codeSnifferPath}/src/Standards`;
const treeStructure = process.argv.includes('tree');

let result = [];

if(!fs.existsSync(codeSnifferPath)){
  console.log('Clone phpcs in the root directory of the repo.');
  return;
}

if(!fs.existsSync(standardsPath)){
  console.log('Could not find folder with standards in phpcs repo.');
  return;
}

let standards = fs.readdirSync(standardsPath);

standards.forEach(standard => {
  if(!fs.existsSync(`${standardsPath}/${standard}/Docs`)){
    console.log(`Docs folder for standard ${standard} does not exist. Skipping...`);
    return;
  }

  let categories = fs.readdirSync(`${standardsPath}/${standard}/Docs`);
  categories.forEach(category => {

    let sniffs = fs.readdirSync(`${standardsPath}/${standard}/Docs/${category}`);
    sniffs.forEach(sniff => {
      let sniffName = sniff.replace("Standard.xml", "");

      let xml = fs.readFileSync(`${standardsPath}/${standard}/Docs/${category}/${sniff}`);
      parser.parseString(xml, (err, res) => {
        if(res.standard) res.standard = res.standard[0];
        if(res.title) res.title = res.title[0];

        res.standard = res.standard.replace("\n    \n    ", "");
        res.standard = res.standard.replace("\n    \n    ", "");

        let sniffObject = {
          key: `${standard}.${category}.${sniffName}`,
          ...res
        };

        if(!treeStructure) {
          result.push(sniffObject);
        }
        else{
          if(result.filter((item) => item.standard == standard).length === 0) {
            result.push({
              key: `${standard}`,
              standard: standard,
              children: []
            })
          }

          let standardObject = result.filter((item) => item.standard == standard)[0];
          if(standardObject.children.filter((item) => item.standard == category).length === 0) {
            standardObject.children.push({
              key: `${standard}.${category}`,
              standard: category,
              children: []
            })
          }

          let categoryObject = standardObject.children.filter((item) => item.standard == category)[0];
          categoryObject.children.push(sniffObject);
        }
      });
    })
  })
})

let filename = `rulesets-${treeStructure ? 'tree' : 'normal'}.json`;
fs.writeFileSync(filename, JSON.stringify(result));
console.log(`Written ${result.length} results to ${filename}.json`);