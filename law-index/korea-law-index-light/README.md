# Korea law index light for AI

![Version](https://img.shields.io/badge/Version-6-blue) ![Type](https://img.shields.io/badge/Type-LLM_Knowledge_Index-green) ![Status](https://img.shields.io/badge/Status-All_Law_Index-orange)

대한민국 법령 전체를 포괄하여 정리한 LLM(Large Language Model) 전용 법령 색인 패키지입니다. 법령 원문을 직접 담기보다, 질문에 적합한 법령군을 식별하고 관련 법률 트랙으로 안내하는 '경량 인덱스 레이어' 역할을 수행합니다.

## 핵심 작동 원리
**본 색인은 외부 검색 도구(국가법령정보센터 API, 웹 검색 등)와 연계되었을 때 완성되는 도구입니다.** LLM이 질문을 받았을 때 이 색인을 통해 탐색해야 할 법령의 범위를 좁히고, 이후 검색 도구를 사용하여 실제 법령 원문을 대조·확인하는 방식으로 작동합니다.

## 주요 특징
- **저부하 설계**: 토큰 소모와 컨텍스트 부하를 줄이기 위해 반복 정보를 제거한 Compact Schema를 사용합니다.
- **회수 정확도**: 법령 정식 명칭 외에도 별칭, 실무어, 자연어 검색어를 포함하여 검색 효율을 높였습니다.
- **분류 및 라우팅**: 민사, 형사, 행정, 조세 등 질문의 성격에 따라 최적의 법률 트랙으로 연결합니다.

## 파일 구성
| 파일명 | 내용 및 역할 |
| :--- | :--- |
| `00_README_AND_RETRIEVAL_POLICY.md` | 패키지 운영 규칙 및 검색 마커 정의 |
| `01_MASTER_LAW_INDEX_ALL.md` | 전체 법령군(3,046개) 마스터 색인 |
| `02_ALIAS_AND_SEARCH_TERMS.md` | 별칭, 실무어, 자연어 키워드 기반 색인 |
| `03_CIVIL_CRIMINAL_PROCEDURE_ROUTE.md` | 민사, 형사, 절차법 관련 라우팅 경로 |
| `04_ADMIN_LABOR_TAX_PUBLIC_ROUTE.md` | 행정, 노동, 조세, 공공법 관련 라우팅 경로 |
| `05_COMPANY_FINANCE_CONSUMER_TECH_SPECIAL_ROUTE.md` | 상사, 금융, 소비자, 기술법 관련 라우팅 경로 |

## 권장 활용 흐름
1. **[색인 탐색]**: `alias` 파일에서 질문의 키워드와 매칭되는 법령군 확인
2. **[트랙 확정]**: `route` 파일을 통해 해당 질문이 속한 법률적 맥락 파악
3. **[원문 검색]**: 식별된 법령명을 기반으로 **외부 검색 도구**를 통해 최신 법령 원문 호출
4. **[답변 생성]**: 확인된 법령 원문과 지식을 결합하여 최종 답변 구성

## 주의사항
- 본 패키지는 탐색을 위한 인덱스이며, 법령 원문을 포함하지 않습니다.
- 실제 법률 적용 시에는 반드시 공식 법령 정보를 통해 최신 개정 상태와 시행 여부를 재확인해야 합니다.
- 본 자료는 전문적인 법률 자문을 대체할 수 없습니다.

