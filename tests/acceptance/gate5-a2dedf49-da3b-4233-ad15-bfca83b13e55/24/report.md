# GhostQA finding evidence

Finding: `2ba7611d-ba67-49cb-8980-4d3f20716c51` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef`, version 1, canonical hash `b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e`.
Approval provenance: DEVELOPER; source `a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial`; eligible as of run acceptance: true.

Original journey length: 3. Best verified journey length: 3.
This is the shortest verified sequence found.
It is locally irreducible under attempted deletion strategy.
Local minimization stop reason: LOCAL MINIMUM.
Truncated: no.

## Expected invariant

When the applicability conditions hold, every approved assertion must be satisfied:

- `{"kind":"json","pointer":"/state","stepId":"later"}` not-equals `{"kind":"literal","value":"PUBLISHED"}`

## Evidence references

- EXPLORATION: evidence `44814fe0-f056-4a64-a434-a7796f99485a`, trial `0a6bba07-bae3-48bd-bcb2-fd7f31b57af7`, baseline `dfb9444e-4535-4d6d-ab25-f0cb72a8a66f`, verdict VIOLATED.
- REPLAY: evidence `1bb46654-ee30-4b9d-842e-049edb8904cb`, trial `7a0cc17a-c7ca-4db6-afd5-8bad5245351a`, baseline `9d6ce9b2-2b47-4d2a-85d1-1033112f0372`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/documents`
2. `archived` — `POST /api/documents/{documentId}/archive`
3. `later` — `POST /api/documents/{documentId}/publish`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `99d9d6a1-043f-4fe5-8619-1fda45ca3466`.
- Remove `archived`: rejected; PREDICATE STEP REQUIRED; candidate `4ec11586-9208-4ca3-a48a-855340a110bb`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `30ed11a9-ef01-4ad9-9796-bafe43e66301`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:08:40.364Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "archived",
        "producer": "create",
        "variable": "docId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "docId"
      }
    ],
    "id": "99c3214e-3cb4-4d40-b8d1-b061a5aa7071",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
      "version": 1
    },
    "rationale": "Journey validating document lifecycle state transitions matching the approved predicate definition for archive and publish constraints.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "docId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/documents",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "archived",
        "operationId": "POST /api/documents/{documentId}/archive",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/documents/{documentId}/publish",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T22:08:40.364Z",
    "deadlineAt": "2026-10-01T22:18:40.364Z",
    "runId": "dd585a89-f409-4081-b070-4157464b9859",
    "trialIds": [
      "0a6bba07-bae3-48bd-bcb2-fd7f31b57af7",
      "7a0cc17a-c7ca-4db6-afd5-8bad5245351a"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "2ba7611d-ba67-49cb-8980-4d3f20716c51",
    "initialEvidenceId": "44814fe0-f056-4a64-a434-a7796f99485a",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "99c3214e-3cb4-4d40-b8d1-b061a5aa7071",
    "originalJourneyId": "99c3214e-3cb4-4d40-b8d1-b061a5aa7071",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
      "version": 1
    },
    "projectId": "b2066e5c-decf-4940-af11-dd2811489e7e",
    "replayEvidenceIds": [
      "1bb46654-ee30-4b9d-842e-049edb8904cb"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "44814fe0-f056-4a64-a434-a7796f99485a"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "44814fe0-f056-4a64-a434-a7796f99485a",
          "1bb46654-ee30-4b9d-842e-049edb8904cb"
        ],
        "next": "CONFIRMED",
        "prior": "OBSERVED VIOLATION",
        "reason": "INDEPENDENT FRESH REPLAY VIOLATED"
      }
    ]
  },
  "formatVersion": 1,
  "generationState": "GENERATED",
  "initial": {
    "baseline": {
      "assertionIds": [
        "91f3464e-ec70-4d4d-b216-fe223756d081"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "dfb9444e-4535-4d6d-ab25-f0cb72a8a66f",
      "resetStepIds": [
        "reset"
      ],
      "runId": "dd585a89-f409-4081-b070-4157464b9859",
      "trialId": "0a6bba07-bae3-48bd-bcb2-fd7f31b57af7",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "dfb9444e-4535-4d6d-ab25-f0cb72a8a66f",
      "id": "44814fe0-f056-4a64-a434-a7796f99485a",
      "observationIds": [
        "7a58ef68-5df5-4a24-82fe-023ce10918b2",
        "b2b937df-37a3-424c-a9db-44a44c7fd97c",
        "dd0ccd14-d614-4f1c-acef-27c1226e5654"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
        "version": 1
      },
      "runId": "dd585a89-f409-4081-b070-4157464b9859",
      "symbolicOperands": {
        "applicability": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "archived"
            },
            "op": "equals",
            "right": {
              "kind": "literal",
              "value": "ARCHIVED"
            }
          },
          {
            "left": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "archived"
            },
            "op": "equals",
            "right": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "later"
            }
          },
          {
            "left": {
              "kind": "step-index",
              "stepId": "archived"
            },
            "op": "before",
            "right": {
              "kind": "step-index",
              "stepId": "later"
            }
          }
        ],
        "assertions": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "later"
            },
            "op": "not-equals",
            "right": {
              "kind": "literal",
              "value": "PUBLISHED"
            }
          }
        ],
        "executionOrder": [
          {
            "operationId": "POST /api/documents",
            "ordinal": 0,
            "stepId": "create"
          },
          {
            "operationId": "POST /api/documents/{documentId}/archive",
            "ordinal": 1,
            "stepId": "archived"
          },
          {
            "operationId": "POST /api/documents/{documentId}/publish",
            "ordinal": 2,
            "stepId": "later"
          }
        ]
      },
      "trialId": "0a6bba07-bae3-48bd-bcb2-fd7f31b57af7"
    },
    "observations": [
      {
        "id": "dd0ccd14-d614-4f1c-acef-27c1226e5654",
        "result": {
          "elapsedMs": 1.4855000000097789,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents",
            "url": "http://127.0.0.1:53272/api/documents"
          },
          "sanitizedResponse": {
            "body": {
              "id": "f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce",
              "state": "DRAFT"
            },
            "elapsedMs": 1.4855000000097789,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:08:44 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce\",\"state\":\"DRAFT\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:08:44.134Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "dd585a89-f409-4081-b070-4157464b9859",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "0a6bba07-bae3-48bd-bcb2-fd7f31b57af7"
      },
      {
        "id": "7a58ef68-5df5-4a24-82fe-023ce10918b2",
        "result": {
          "elapsedMs": 1.474291999998968,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/archive",
            "url": "http://127.0.0.1:53272/api/documents/f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce/archive"
          },
          "sanitizedResponse": {
            "body": {
              "id": "f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce",
              "state": "ARCHIVED"
            },
            "elapsedMs": 1.474291999998968,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:08:44 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce\",\"state\":\"ARCHIVED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:08:44.139Z",
          "status": 200,
          "stepId": "archived",
          "truncated": false
        },
        "runId": "dd585a89-f409-4081-b070-4157464b9859",
        "stateMappings": [],
        "stepId": "archived",
        "trialId": "0a6bba07-bae3-48bd-bcb2-fd7f31b57af7"
      },
      {
        "id": "b2b937df-37a3-424c-a9db-44a44c7fd97c",
        "result": {
          "elapsedMs": 1.478333000006387,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/publish",
            "url": "http://127.0.0.1:53272/api/documents/f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce/publish"
          },
          "sanitizedResponse": {
            "body": {
              "id": "f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce",
              "state": "PUBLISHED"
            },
            "elapsedMs": 1.478333000006387,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:08:44 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"f8129efa-6a09-4bd2-99a8-0b88f3a1d5ce\",\"state\":\"PUBLISHED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:08:44.144Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "dd585a89-f409-4081-b070-4157464b9859",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "0a6bba07-bae3-48bd-bcb2-fd7f31b57af7"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "99d9d6a1-043f-4fe5-8619-1fda45ca3466",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
            "version": 1
          },
          "rationale": "Journey validating document lifecycle state transitions matching the approved predicate definition for archive and publish constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "archived",
              "operationId": "POST /api/documents/{documentId}/archive",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/documents/{documentId}/publish",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PRODUCER REQUIRED",
        "removedStepId": "create"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "later",
              "producer": "create",
              "variable": "docId"
            }
          ],
          "id": "4ec11586-9208-4ca3-a48a-855340a110bb",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
            "version": 1
          },
          "rationale": "Journey validating document lifecycle state transitions matching the approved predicate definition for archive and publish constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "docId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/documents",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/documents/{documentId}/publish",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PREDICATE STEP REQUIRED",
        "removedStepId": "archived"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "archived",
              "producer": "create",
              "variable": "docId"
            }
          ],
          "id": "30ed11a9-ef01-4ad9-9796-bafe43e66301",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
            "version": 1
          },
          "rationale": "Journey validating document lifecycle state transitions matching the approved predicate definition for archive and publish constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "docId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/documents",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "archived",
              "operationId": "POST /api/documents/{documentId}/archive",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PREDICATE STEP REQUIRED",
        "removedStepId": "later"
      }
    ],
    "best": {
      "dependencies": [
        {
          "consumer": "archived",
          "producer": "create",
          "variable": "docId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "docId"
        }
      ],
      "id": "99c3214e-3cb4-4d40-b8d1-b061a5aa7071",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
        "version": 1
      },
      "rationale": "Journey validating document lifecycle state transitions matching the approved predicate definition for archive and publish constraints.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "docId",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ],
          "id": "create",
          "operationId": "POST /api/documents",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200,
            409
          ],
          "extracts": [],
          "id": "archived",
          "operationId": "POST /api/documents/{documentId}/archive",
          "parameters": [
            {
              "location": "path",
              "name": "documentId",
              "value": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ]
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200,
            409
          ],
          "extracts": [],
          "id": "later",
          "operationId": "POST /api/documents/{documentId}/publish",
          "parameters": [
            {
              "location": "path",
              "name": "documentId",
              "value": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ]
        }
      ],
      "variables": []
    },
    "bestLength": 3,
    "finding": {
      "classification": "CONFIRMED",
      "consistent": true,
      "id": "2ba7611d-ba67-49cb-8980-4d3f20716c51",
      "initialEvidenceId": "44814fe0-f056-4a64-a434-a7796f99485a",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "99c3214e-3cb4-4d40-b8d1-b061a5aa7071",
      "originalJourneyId": "99c3214e-3cb4-4d40-b8d1-b061a5aa7071",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
        "version": 1
      },
      "projectId": "b2066e5c-decf-4940-af11-dd2811489e7e",
      "replayEvidenceIds": [
        "1bb46654-ee30-4b9d-842e-049edb8904cb"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "44814fe0-f056-4a64-a434-a7796f99485a"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "44814fe0-f056-4a64-a434-a7796f99485a",
            "1bb46654-ee30-4b9d-842e-049edb8904cb"
          ],
          "next": "CONFIRMED",
          "prior": "OBSERVED VIOLATION",
          "reason": "INDEPENDENT FRESH REPLAY VIOLATED"
        }
      ]
    },
    "locallyIrreducible": true,
    "originalLength": 3,
    "stopReason": "LOCAL MINIMUM"
  },
  "originalJourney": {
    "dependencies": [
      {
        "consumer": "archived",
        "producer": "create",
        "variable": "docId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "docId"
      }
    ],
    "id": "99c3214e-3cb4-4d40-b8d1-b061a5aa7071",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
      "version": 1
    },
    "rationale": "Journey validating document lifecycle state transitions matching the approved predicate definition for archive and publish constraints.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "docId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/documents",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "archived",
        "operationId": "POST /api/documents/{documentId}/archive",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200,
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/documents/{documentId}/publish",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "originalLength": 3,
  "predicate": {
    "applicability": [
      {
        "left": {
          "kind": "json",
          "pointer": "/state",
          "stepId": "archived"
        },
        "op": "equals",
        "right": {
          "kind": "literal",
          "value": "ARCHIVED"
        }
      },
      {
        "left": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "archived"
        },
        "op": "equals",
        "right": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "later"
        }
      },
      {
        "left": {
          "kind": "step-index",
          "stepId": "archived"
        },
        "op": "before",
        "right": {
          "kind": "step-index",
          "stepId": "later"
        }
      }
    ],
    "assertions": [
      {
        "left": {
          "kind": "json",
          "pointer": "/state",
          "stepId": "later"
        },
        "op": "not-equals",
        "right": {
          "kind": "literal",
          "value": "PUBLISHED"
        }
      }
    ],
    "canonicalHash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
    "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
    "source": "DEVELOPER",
    "sourceRef": "a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
    "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "91f3464e-ec70-4d4d-b216-fe223756d081"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "9d6ce9b2-2b47-4d2a-85d1-1033112f0372",
        "resetStepIds": [
          "reset"
        ],
        "runId": "dd585a89-f409-4081-b070-4157464b9859",
        "trialId": "7a0cc17a-c7ca-4db6-afd5-8bad5245351a",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "9d6ce9b2-2b47-4d2a-85d1-1033112f0372",
        "id": "1bb46654-ee30-4b9d-842e-049edb8904cb",
        "observationIds": [
          "94647185-6f6a-4fd7-a8f1-6f09c957ee23",
          "f053922a-0f5d-4185-9f36-7676e72b1584",
          "0b54c428-7df9-48e7-9e22-192c52ba5a0e"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
          "id": "fb1a0624-6ab9-4dfc-bbd2-c4508e8290ef",
          "version": 1
        },
        "runId": "dd585a89-f409-4081-b070-4157464b9859",
        "symbolicOperands": {
          "applicability": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "archived"
              },
              "op": "equals",
              "right": {
                "kind": "literal",
                "value": "ARCHIVED"
              }
            },
            {
              "left": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "archived"
              },
              "op": "equals",
              "right": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "later"
              }
            },
            {
              "left": {
                "kind": "step-index",
                "stepId": "archived"
              },
              "op": "before",
              "right": {
                "kind": "step-index",
                "stepId": "later"
              }
            }
          ],
          "assertions": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "later"
              },
              "op": "not-equals",
              "right": {
                "kind": "literal",
                "value": "PUBLISHED"
              }
            }
          ],
          "executionOrder": [
            {
              "operationId": "POST /api/documents",
              "ordinal": 0,
              "stepId": "create"
            },
            {
              "operationId": "POST /api/documents/{documentId}/archive",
              "ordinal": 1,
              "stepId": "archived"
            },
            {
              "operationId": "POST /api/documents/{documentId}/publish",
              "ordinal": 2,
              "stepId": "later"
            }
          ]
        },
        "trialId": "7a0cc17a-c7ca-4db6-afd5-8bad5245351a"
      },
      "observations": [
        {
          "id": "94647185-6f6a-4fd7-a8f1-6f09c957ee23",
          "result": {
            "elapsedMs": 1.5386670000152662,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents",
              "url": "http://127.0.0.1:53272/api/documents"
            },
            "sanitizedResponse": {
              "body": {
                "id": "73ed98f7-d3a3-4a2f-85ce-079c07c0d456",
                "state": "DRAFT"
              },
              "elapsedMs": 1.5386670000152662,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:08:44 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"73ed98f7-d3a3-4a2f-85ce-079c07c0d456\",\"state\":\"DRAFT\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:08:44.176Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "dd585a89-f409-4081-b070-4157464b9859",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "7a0cc17a-c7ca-4db6-afd5-8bad5245351a"
        },
        {
          "id": "f053922a-0f5d-4185-9f36-7676e72b1584",
          "result": {
            "elapsedMs": 2.1636250000155997,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/archive",
              "url": "http://127.0.0.1:53272/api/documents/73ed98f7-d3a3-4a2f-85ce-079c07c0d456/archive"
            },
            "sanitizedResponse": {
              "body": {
                "id": "73ed98f7-d3a3-4a2f-85ce-079c07c0d456",
                "state": "ARCHIVED"
              },
              "elapsedMs": 2.1636250000155997,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:08:44 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"73ed98f7-d3a3-4a2f-85ce-079c07c0d456\",\"state\":\"ARCHIVED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:08:44.180Z",
            "status": 200,
            "stepId": "archived",
            "truncated": false
          },
          "runId": "dd585a89-f409-4081-b070-4157464b9859",
          "stateMappings": [],
          "stepId": "archived",
          "trialId": "7a0cc17a-c7ca-4db6-afd5-8bad5245351a"
        },
        {
          "id": "0b54c428-7df9-48e7-9e22-192c52ba5a0e",
          "result": {
            "elapsedMs": 1.6746669999847654,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/publish",
              "url": "http://127.0.0.1:53272/api/documents/73ed98f7-d3a3-4a2f-85ce-079c07c0d456/publish"
            },
            "sanitizedResponse": {
              "body": {
                "id": "73ed98f7-d3a3-4a2f-85ce-079c07c0d456",
                "state": "PUBLISHED"
              },
              "elapsedMs": 1.6746669999847654,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:08:44 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"73ed98f7-d3a3-4a2f-85ce-079c07c0d456\",\"state\":\"PUBLISHED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:08:44.186Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "dd585a89-f409-4081-b070-4157464b9859",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "7a0cc17a-c7ca-4db6-afd5-8bad5245351a"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "dd585a89-f409-4081-b070-4157464b9859",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
