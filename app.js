const axios = require('axios');
const express = require('express');
const file = require('fs');

const app = express();

const clientId = 'e265bb5b4107c0d8保密'; // 在 https://github.com/settings/developers 的 OAuth Apps 里获取
const clientSecret = '9501e7f0b6ecee76763f0b0037b4ca87e4f0保密'; // 同上
const commentUrl = 'https://api.github.com/repos/Kennytian/meiqia-react-native/issues/comments';
const host = '127.0.0.1'; // 这里的域名和端口需要填写至 GitHub 后台
const port = 3005;
const tokenPath = `${ process.cwd() }/token.txt`;

app.get('/', (req, res) => {
  const localToken = readLocalToken();
  if (!localToken) {
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${ clientId }&scope=repo`);
  } else {
    updateComment().then(() => {
      res.json({ok: 1, message: '内容更新成功'});
    }).catch(err => {
      res.json({ok: 0, message: err.message})
    })
  }
});

const readLocalToken = () => {
  if (!file.existsSync(tokenPath)) {
    return '';
  }
  return file.readFileSync(tokenPath).toString();
};

const writeLocalToken = (content) => {
  file.writeFileSync(tokenPath, content);
};

const updateComment = async () => {
  const token = readLocalToken();
  if (!token) {
    return;
  }
  await axios.get(commentUrl).then(async res => {
    const [comment] = res.data;
    const {id, body} = comment;
    await axios.patch(`${ commentUrl }/${ id }`, {
      body: body.replace('版本', '版本本')
    }, {headers: {authorization: `token ${ token }`}}).then((({data}) => {
      return data.body;
    }));
    return res.data;
  }).catch(err => {
    if (err.message.indexOf('401')) {
      writeLocalToken('');
      throw new Error('授权失效，请重新授权');
    }
    throw err;
  });

};

app.get('/oauth-callback', (req, res) => {
  const data = {
    client_id: clientId,
    client_secret: clientSecret,
    code: req.query.code,
  };
  const config = {headers: {accept: 'application/json'}};
  axios.post(`https://github.com/login/oauth/access_token`, data, config).then(async ({data}) => {
    const {access_token} = data;
    writeLocalToken(access_token);
    await updateComment();
    await res.json({ok: 1, message: '授权成功，内容也更新成功！'});
  }).catch(err => {
    res.status(500).json({message: err.message});
    writeLocalToken('');
  });
});

app.listen(port, host);
console.log(`App listening on http://${ host }:${ port }`);
