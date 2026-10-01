# Country Test Worker

检测访问者的出口 IP 是否属于指定国家/地区。使用 Cloudflare 自带的
`request.cf.country`，无需外部 GeoIP API、数据库或 API Key。

## 部署

在 Cloudflare Workers 控制台创建 Worker，将 `worker.js` 的内容粘贴到编辑器并部署。
也可以在本目录运行：

```sh
npx wrangler deploy
```

实际地址以 Cloudflare 分配的 Workers URL 为准，例如：
`https://geoip-test.<你的子域>.workers.dev/geoip-test?country=cn`。

## 请求和响应

支持 GET 和 HEAD。保留 `/geoip-test` 路径，支持以下两种查询：

- `?country=cn`：CN 客户端返回 200，非 CN 返回 403。
- `?not_country=cn`：非 CN 客户端返回 200，CN 返回 403。

两种参数均使用两个英文字母的国家/地区代码，不区分大小写，
例如 `cn`、`us`、`jp`、`hk`。参数不能重复，也不能同时传入两种参数。

直接访问 `/geoip-test`（不带 `country` 和 `not_country`）会返回 HTML 页面，显示
`Country: CN` 等检测结果；无法获取国家/地区时显示“未知”并返回 503。
显式传入空值 `?country=` 或 `?not_country=` 视为参数错误。旧的 `geoip` 参数不再用于匹配。
独立 GeoIP 数据库匹配尚未实现，当前使用 Cloudflare 的国家/地区信息。

| HTTP 状态码 | 含义 |
| --- | --- |
| 200 | 满足查询条件，或成功显示国家/地区页面 |
| 403 | 不满足查询条件 |
| 400 | 参数为空、重复、格式错误（XX 不接受），或同时传入 country 和 not_country |
| 503 | Cloudflare 未提供可用的国家/地区信息 |
| 404 | 路径不是 /geoip-test |
| 405 | 方法不是 GET 或 HEAD |

匹配时的 JSON 示例（IP 为示例值）：

```json
{"ip":"203.0.113.1","country":"CN","target":"CN","match":true}
```

`match` 表示是否满足本次查询条件。对于 `?not_country=cn`，非 CN 客户端
的 `match` 为 `true`。无法识别国家/地区时，两种查询都返回 503，不视为满足反向条件。

仅检查 HTTP 状态码：

```sh
curl -s -o /dev/null -w '%{http_code}\n' 'https://geoip-test.<你的子域>.workers.dev/geoip-test?country=cn'
```

响应禁用缓存，避免不同访问者之间复用检测结果。使用 VPN 或代理时，判断的是出口 IP
所在地区。判定以 Cloudflare 的 IP 地理数据库为准，不代表用户的实际物理位置。
控制台/Playground 预览不提供 `request.cf`，因此可能返回 503；请访问部署后的 URL 验证。

官方说明：
- [Request cf 属性](https://developers.cloudflare.com/workers/runtime-apis/request/)
- [Cloudflare 请求头](https://developers.cloudflare.com/fundamentals/reference/http-headers/)
