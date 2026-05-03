# CLAUDE.md

이 파일은 Claude Code가 이 저장소에서 작업할 때 참고하는 컨텍스트입니다.

## 프로젝트 개요

`@us-all/openmetadata-mcp` — OpenMetadata REST API를 MCP stdio 서버로 노출. **156 도구**(meta 1 + 도메인 155)로 metadata 관리, lineage, search(키워드+semantic), data quality, sample-data 전 영역 커버. Read-only 기본, 쓰기는 `OPENMETADATA_ALLOW_WRITE=true`로 옵트인.

- **타겟 OpenMetadata**: 1.x (1.12+ semantic search 활용)
- **런타임**: Node 18+, stdio transport, TypeScript strict
- **인증**: JWT Bot 토큰 (`OPENMETADATA_TOKEN`)
- **표준**: [@us-all MCP Standard](https://github.com/us-all/mcp-toolkit/blob/main/STANDARD.md) 준수

## 디렉토리

```
src/
├── index.ts                # MCP 서버 + tool() 헬퍼 + 카테고리별 도구 등록
├── config.ts               # ENV 로딩 (OM_TOOLS / OM_DISABLE 토글 포함)
├── client.ts               # OpenMetadata REST 클라이언트 (JSON-Patch 자동 처리)
├── tool-registry.ts        # CATEGORIES 정의 + @us-all/mcp-toolkit 사용
├── resources.ts            # MCP Resources (om:// URI scheme)
└── tools/
    ├── utils.ts            # wrapToolHandler (auto-extractFields), assertWriteAllowed, error sanitization
    ├── extract-fields.ts   # toolkit re-export (backward compat)
    ├── search.ts           # search-metadata, suggest-metadata
    ├── semantic-search.ts  # OM 1.12+ /search/vector/query
    ├── tables.ts           # CRUD (extractFields 적용)
    ├── databases.ts schemas.ts lineage.ts services.ts ...   # 30+ entity files
    ├── aggregations.ts     # get-table-summary (round-trip 제거)
    └── sample-data.ts      # 6 sample-data 도구
```

## Build & Run

```bash
pnpm install
pnpm build              # tsc → dist/
pnpm test               # vitest (extract-fields tests)
pnpm token-stats        # tools/list 토큰 측정
```

## 카테고리 (9)

`OM_TOOLS=core,governance,quality` 같이 ENV 토글로 일부만 로드 가능.

| 카테고리 | 포함 도구 |
|---------|----------|
| `search` | search-metadata, suggest-metadata, semantic-search |
| `core` | tables, databases, schemas, lineage, get-table-summary |
| `discovery` | dashboards, pipelines, charts, topics, mlmodels, containers, queries, stored-procedures |
| `governance` | glossary, classifications, tags, domains, dataproducts |
| `quality` | data-quality (test-suites/cases), sample-data |
| `services` | database/dashboard/messaging/pipeline/mlmodel/storage services |
| `admin` | users, teams, access (roles/policies), bots |
| `events` | event subscriptions |
| `meta` | search-tools (항상 활성) |

## MCP Resources (om://)

| URI | 설명 |
|-----|------|
| `om://table/{fqn}` | table by FQN with columns/owners/tags/joins |
| `om://glossary-term/{fqn}` | glossary term |
| `om://lineage/{type}/{fqn}` | upstream + downstream edges (depth 3) |
| `om://search/{query}` | top 10 keyword search 결과 |
| `om://dashboard/{fqn}` | dashboard with charts/owners/tags |
| `om://pipeline/{fqn}` | pipeline with tasks |
| `om://schema/{fqn}` | database schema |

## 설계 원칙

- **Read-only by default**: 쓰기는 `OPENMETADATA_ALLOW_WRITE=true` 게이트.
- **Token-efficient by design**: 카테고리 토글 + extractFields 자동 적용 + search-tools 메타툴 + Resources.
- **Schema-first**: 모든 도구 `<name>Schema` (zod) + `<name>` handler 페어. 모든 필드 `.describe()`.
- **JSON Patch 업데이트**: PATCH 요청 시 `application/json-patch+json` content-type 자동 처리 (client.ts).
- **민감정보 redaction**: 에러 메시지에서 token/password 패턴 `[REDACTED]`.

## 최근 변경사항

- **v1.10.2** (2026-05-03): Wave 5 — OM 1.12+ 5개 entity tools(Data Contract, Metric, Search Index, API Collection, API Endpoint × list+get-by-name = 10 handler)에 default extractFields 적용. changeDescription/incrementalChangeDescription/version/updatedBy/href noise 드롭, entity별 high-signal 필드(metricExpression, endpointURL 등) 보존.
- **v1.10.1** (2026-05-03): `get-domain-summary` search query가 단수 `domain.fullyQualifiedName`을 사용했으나 OM entity는 복수 `domains` 배열을 반영 → 도메인 매칭 0건이던 문제 수정. 수동 검증으로 발견.
- **v1.10.0** (2026-05-02): `get-domain-summary` 어그리게이션 — domain + 6 child entity types(/search/query + track_total_hits, /dataProducts native filter) 1 call.
- **v1.9.0** (2026-05-02): OM 1.12+ entity types — Data Contract / Metric / Search Index / API Collection / API Endpoint. Resources 3개 + 10개 read-only 도구. 새 `entities` 카테고리.
- **v1.8.0** (2026-05-02): MCP Prompts 4개 — `lineage-impact-analysis`, `data-quality-investigation`, `glossary-term-bootstrap`, `owner-change-propagation`.
- **v1.7.2** (2026-05-02): Wave 1 — describe trim 12, 의존성 bumps, fat-read 3개에 default extractFields(get-table, get-dashboard, list-test-cases).
- **v1.7.1** (2026-05-02): `@us-all/mcp-toolkit ^0.2.0` 채택 — 로컬 `sanitize` / `wrapToolHandler` 본문 제거, `createWrapToolHandler` factory로 위임. `redactionPatterns: [/OPENMETADATA_TOKEN/i]` + `errorExtractors`(WriteBlockedError → passthrough, OpenMetadataError → structured)만 명시. utils.ts 73→43 lines.
- **v1.7.0** (2026-05-01): `@us-all/mcp-toolkit ^0.1.0` 마이그레이션 — tool-registry/extract-fields toolkit 위임. ~209 lines 절감.
- **v1.6.2**: 추가 MCP Resources (dashboard, pipeline, schema by FQN).
- **v1.6.0**: `get-table-summary` 어그리게이션 도구 — table + lineage + sample + DQ 1 call.
- **v1.5.0**: MCP Resources (om:// URI) — table, glossary-term, lineage, search.
- **v1.4.0**: `extractFields` sweep — 24개 추가 read 도구에 적용 (총 28개).
- **v1.3.0**: 토큰 효율 표준 (OM_TOOLS / OM_DISABLE 9 카테고리 + search-tools + extractFields).
- **v1.2.1**: hono >=4.12.14 보안 패치 (GHSA-458j-xx4x-4375).
- **v1.2.0**: `semantic-search` 도구 (OM 1.12+ vector). README pivot — embedded MCP 보완 포지셔닝.
- **v1.1.0**: sample-data 6개 도구 (tables/topics/containers).

## 알려진 이슈

- **OM 1.12 embedded MCP 등장**: 자체 OpenMetadata 서버에 MCP가 내장됨. 이 패키지는 deep CRUD + 구버전 OM 호환 + sample-data 강점으로 보완 포지셔닝.
- **사용량 변동**: 1.12 보급 후 이 패키지 다운로드 추세는 별도 모니터링 필요.

## 개선 로드맵

- [x] 토큰 효율 표준 (카테고리 ENV + extractFields + search-tools)
- [x] MCP Resources (om:// URI)
- [x] Aggregation 도구 (get-table-summary)
- [x] @us-all/mcp-toolkit 마이그레이션
- [ ] semantic-search 응답 구조 검증 (OM 1.12+ 인스턴스 필요)
- [ ] DQ test definitions / RCA 어그리게이션 (1.12 embedded MCP feature parity)
- [ ] 신규 entity 5종 (API Collection / Endpoint / Search Index / Metric / Data Contract) CRUD

## 표준 가이드

`@us-all` MCP 작성 표준은 [mcp-toolkit/STANDARD.md](https://github.com/us-all/mcp-toolkit/blob/main/STANDARD.md)에 있음.
