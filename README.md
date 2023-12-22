# Automate OPAC

## 概要

このプログラムは、OpenAM + Shibboleth + iLisWave で動作している図書館システムにおいて、自動で貸し出し図書の解析と延長処理を行うプログラムです。

## 動作環境

Bun で開発と実行を行っており、将来的に Cloudflare Workers を利用することを想定しています。

## 仕組み

このスクリプトは、OpenAM と Shibboleth の併用環境においてログインを行う際に有効です。

### OpenAM: シングルサインオンを実装するためのソフトウェア

https://www.designet.co.jp/ossinfo/openam/

LDAP や Active Directory 等のデータベースに登録されたユーザー情報を利用して、Web サービスやクラウドサービス等の認証を行うためのソフトウェアです。
IdP (Identity Provider) として動作し、SP (Service Provider) として動作するサービスに対して、シングルサインオンを実現します。

### Shibboleth: シングルサインオンを実装するためのソフトウェア

https://www.gakunin.jp/sites/default/files/2019-10/camp-otani%20%281%29.pdf

こちらも、OpenAM と同様にシングルサインオンを実現するためのソフトウェアです。

OpenAM が組織内の認証に特化しているのに対し、Shibboleth は組織外部での認証に特化しています。

どちらも、大学や研究機関等の組織内での利用で見かけることが多いです。

また、Shibboleth は SAML 認証をおこなうため、XML 形式での認証情報のやり取りを行います。

### OpenAM と Shibboleth の併用

https://www.osstech.co.jp/_media/techinfo/seminar/openam-shibboleth.pdf

OpenAM と Shibboleth の併用を行うことも可能です。

### iLisWave: 図書館システム

https://www.fujitsu.com/jp/solutions/industry/education/campus/library/

iLisWave は、富士通の開発する図書館システムの一つです。

Shibboleth 認証に対応しています。

### このスクリプトの動作

処理フローを以下に解説します。

- OpenAM にログインしトークンの取得
- Shibboleth にトークンを提示し、Shibboleth セッションとその他パラメータを取得
- iLisWave に Shibboleth セッションとその他パラメータを提示し、図書館システムへログイン
