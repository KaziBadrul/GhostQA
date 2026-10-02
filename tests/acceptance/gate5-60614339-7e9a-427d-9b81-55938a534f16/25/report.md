# GhostQA finding evidence

Finding: `9b43a968-35b9-4eb1-97e0-fcf456705e71` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `9673239f-b158-4c85-a99c-ce4941d8f402`, version 1, canonical hash `b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e`.
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

- EXPLORATION: evidence `65d696cf-ba80-48e2-a10c-f17a6cf794a8`, trial `de8baf0b-ab3c-450b-adf5-34273ff2d063`, baseline `09a6e202-5c65-4429-8560-dbe8608085d4`, verdict VIOLATED.
- REPLAY: evidence `79b3db6d-3366-4d9b-a876-1986dcd69e3b`, trial `2c661b50-21ea-4d93-baa8-cfc3f8874f57`, baseline `6cbaba6e-7e55-4ab5-a776-64cb349a6f94`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/documents`
2. `archived` — `POST /api/documents/{documentId}/archive`
3. `later` — `POST /api/documents/{documentId}/publish`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `ee23267e-d09a-4b1b-9e4d-d560c4340065`.
- Remove `archived`: rejected; PREDICATE STEP REQUIRED; candidate `18a13a9e-cdbe-4a37-9e53-aeda764f0bd6`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `77edee52-dbb7-4944-bf30-1ddb639b6512`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:22:17.684Z",
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
    "id": "56578262-3e94-40d7-9fa3-d9734b661237",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
      "version": 1
    },
    "rationale": "Validating document state transition where archiving prevents publishing.",
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
          200
        ],
        "extracts": [],
        "id": "archived",
        "operationId": "POST /api/documents/{documentId}/archive",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "variable",
              "name": "docId"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409,
          200
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/documents/{documentId}/publish",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "variable",
              "name": "docId"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T22:22:17.684Z",
    "deadlineAt": "2026-10-01T22:32:17.684Z",
    "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
    "trialIds": [
      "de8baf0b-ab3c-450b-adf5-34273ff2d063",
      "2c661b50-21ea-4d93-baa8-cfc3f8874f57"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "9b43a968-35b9-4eb1-97e0-fcf456705e71",
    "initialEvidenceId": "65d696cf-ba80-48e2-a10c-f17a6cf794a8",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "56578262-3e94-40d7-9fa3-d9734b661237",
    "originalJourneyId": "56578262-3e94-40d7-9fa3-d9734b661237",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
      "version": 1
    },
    "projectId": "33743e3f-81ed-443d-83b4-1f3b05106b8e",
    "replayEvidenceIds": [
      "79b3db6d-3366-4d9b-a876-1986dcd69e3b"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "65d696cf-ba80-48e2-a10c-f17a6cf794a8"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "65d696cf-ba80-48e2-a10c-f17a6cf794a8",
          "79b3db6d-3366-4d9b-a876-1986dcd69e3b"
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
        "8172dbb7-e29b-4d74-b354-2e120a61847d"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "09a6e202-5c65-4429-8560-dbe8608085d4",
      "resetStepIds": [
        "reset"
      ],
      "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
      "trialId": "de8baf0b-ab3c-450b-adf5-34273ff2d063",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "09a6e202-5c65-4429-8560-dbe8608085d4",
      "id": "65d696cf-ba80-48e2-a10c-f17a6cf794a8",
      "observationIds": [
        "79881903-01b4-4dc3-bd31-0e1d80a376c3",
        "69c53bcf-3b9a-4de4-a323-7e90449f4bac",
        "f632b085-4783-4963-9278-4839c4185c6d"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
        "version": 1
      },
      "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
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
      "trialId": "de8baf0b-ab3c-450b-adf5-34273ff2d063"
    },
    "observations": [
      {
        "id": "79881903-01b4-4dc3-bd31-0e1d80a376c3",
        "result": {
          "elapsedMs": 1.5253329999977723,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents",
            "url": "http://127.0.0.1:54400/api/documents"
          },
          "sanitizedResponse": {
            "body": {
              "id": "73eaffdf-5b27-4b53-a769-5a3aa58949a3",
              "state": "DRAFT"
            },
            "elapsedMs": 1.5253329999977723,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:22:21 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"73eaffdf-5b27-4b53-a769-5a3aa58949a3\",\"state\":\"DRAFT\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:22:21.927Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "de8baf0b-ab3c-450b-adf5-34273ff2d063"
      },
      {
        "id": "69c53bcf-3b9a-4de4-a323-7e90449f4bac",
        "result": {
          "elapsedMs": 1.472875000006752,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/archive",
            "url": "http://127.0.0.1:54400/api/documents/73eaffdf-5b27-4b53-a769-5a3aa58949a3/archive"
          },
          "sanitizedResponse": {
            "body": {
              "id": "73eaffdf-5b27-4b53-a769-5a3aa58949a3",
              "state": "ARCHIVED"
            },
            "elapsedMs": 1.472875000006752,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:22:21 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"73eaffdf-5b27-4b53-a769-5a3aa58949a3\",\"state\":\"ARCHIVED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:22:21.932Z",
          "status": 200,
          "stepId": "archived",
          "truncated": false
        },
        "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
        "stateMappings": [],
        "stepId": "archived",
        "trialId": "de8baf0b-ab3c-450b-adf5-34273ff2d063"
      },
      {
        "id": "f632b085-4783-4963-9278-4839c4185c6d",
        "result": {
          "elapsedMs": 1.382207999995444,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/documents/{documentId}/publish",
            "url": "http://127.0.0.1:54400/api/documents/73eaffdf-5b27-4b53-a769-5a3aa58949a3/publish"
          },
          "sanitizedResponse": {
            "body": {
              "id": "73eaffdf-5b27-4b53-a769-5a3aa58949a3",
              "state": "PUBLISHED"
            },
            "elapsedMs": 1.382207999995444,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:22:21 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"73eaffdf-5b27-4b53-a769-5a3aa58949a3\",\"state\":\"PUBLISHED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:22:21.937Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "de8baf0b-ab3c-450b-adf5-34273ff2d063"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "ee23267e-d09a-4b1b-9e4d-d560c4340065",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
            "version": 1
          },
          "rationale": "Validating document state transition where archiving prevents publishing.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [],
              "id": "archived",
              "operationId": "POST /api/documents/{documentId}/archive",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "variable",
                    "name": "docId"
                  }
                }
              ]
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409,
                200
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/documents/{documentId}/publish",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "variable",
                    "name": "docId"
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
          "id": "18a13a9e-cdbe-4a37-9e53-aeda764f0bd6",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
            "version": 1
          },
          "rationale": "Validating document state transition where archiving prevents publishing.",
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
                409,
                200
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/documents/{documentId}/publish",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "variable",
                    "name": "docId"
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
          "id": "77edee52-dbb7-4944-bf30-1ddb639b6512",
          "predicateRef": {
            "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
            "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
            "version": 1
          },
          "rationale": "Validating document state transition where archiving prevents publishing.",
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
                200
              ],
              "extracts": [],
              "id": "archived",
              "operationId": "POST /api/documents/{documentId}/archive",
              "parameters": [
                {
                  "location": "path",
                  "name": "documentId",
                  "value": {
                    "kind": "variable",
                    "name": "docId"
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
      "id": "56578262-3e94-40d7-9fa3-d9734b661237",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
        "version": 1
      },
      "rationale": "Validating document state transition where archiving prevents publishing.",
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
            200
          ],
          "extracts": [],
          "id": "archived",
          "operationId": "POST /api/documents/{documentId}/archive",
          "parameters": [
            {
              "location": "path",
              "name": "documentId",
              "value": {
                "kind": "variable",
                "name": "docId"
              }
            }
          ]
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            409,
            200
          ],
          "extracts": [],
          "id": "later",
          "operationId": "POST /api/documents/{documentId}/publish",
          "parameters": [
            {
              "location": "path",
              "name": "documentId",
              "value": {
                "kind": "variable",
                "name": "docId"
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
      "id": "9b43a968-35b9-4eb1-97e0-fcf456705e71",
      "initialEvidenceId": "65d696cf-ba80-48e2-a10c-f17a6cf794a8",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "56578262-3e94-40d7-9fa3-d9734b661237",
      "originalJourneyId": "56578262-3e94-40d7-9fa3-d9734b661237",
      "predicateRef": {
        "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
        "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
        "version": 1
      },
      "projectId": "33743e3f-81ed-443d-83b4-1f3b05106b8e",
      "replayEvidenceIds": [
        "79b3db6d-3366-4d9b-a876-1986dcd69e3b"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "65d696cf-ba80-48e2-a10c-f17a6cf794a8"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "65d696cf-ba80-48e2-a10c-f17a6cf794a8",
            "79b3db6d-3366-4d9b-a876-1986dcd69e3b"
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
    "id": "56578262-3e94-40d7-9fa3-d9734b661237",
    "predicateRef": {
      "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
      "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
      "version": 1
    },
    "rationale": "Validating document state transition where archiving prevents publishing.",
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
          200
        ],
        "extracts": [],
        "id": "archived",
        "operationId": "POST /api/documents/{documentId}/archive",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "variable",
              "name": "docId"
            }
          }
        ]
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          409,
          200
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/documents/{documentId}/publish",
        "parameters": [
          {
            "location": "path",
            "name": "documentId",
            "value": {
              "kind": "variable",
              "name": "docId"
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
    "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
    "source": "DEVELOPER",
    "sourceRef": "a document observed as ARCHIVED must not later be observed as PUBLISHED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
    "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "8172dbb7-e29b-4d74-b354-2e120a61847d"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "6cbaba6e-7e55-4ab5-a776-64cb349a6f94",
        "resetStepIds": [
          "reset"
        ],
        "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
        "trialId": "2c661b50-21ea-4d93-baa8-cfc3f8874f57",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "6cbaba6e-7e55-4ab5-a776-64cb349a6f94",
        "id": "79b3db6d-3366-4d9b-a876-1986dcd69e3b",
        "observationIds": [
          "fcebb79e-74d2-43ce-850f-064142937b62",
          "9f2d93f5-d443-4c0b-8c3b-cd75e3574aed",
          "ee1778ff-9ee7-4201-993b-4665ffbf7d35"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "b5ac6e3fb532bdb7fc0a561914081018ce1d73f5adb864df9589005f39d5be7e",
          "id": "9673239f-b158-4c85-a99c-ce4941d8f402",
          "version": 1
        },
        "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
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
        "trialId": "2c661b50-21ea-4d93-baa8-cfc3f8874f57"
      },
      "observations": [
        {
          "id": "9f2d93f5-d443-4c0b-8c3b-cd75e3574aed",
          "result": {
            "elapsedMs": 1.03491699998267,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents",
              "url": "http://127.0.0.1:54400/api/documents"
            },
            "sanitizedResponse": {
              "body": {
                "id": "a83585b8-e774-4c4a-94e0-688d63672cc8",
                "state": "DRAFT"
              },
              "elapsedMs": 1.03491699998267,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:22:21 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"a83585b8-e774-4c4a-94e0-688d63672cc8\",\"state\":\"DRAFT\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:22:21.967Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "2c661b50-21ea-4d93-baa8-cfc3f8874f57"
        },
        {
          "id": "fcebb79e-74d2-43ce-850f-064142937b62",
          "result": {
            "elapsedMs": 0.9318750000093132,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/archive",
              "url": "http://127.0.0.1:54400/api/documents/a83585b8-e774-4c4a-94e0-688d63672cc8/archive"
            },
            "sanitizedResponse": {
              "body": {
                "id": "a83585b8-e774-4c4a-94e0-688d63672cc8",
                "state": "ARCHIVED"
              },
              "elapsedMs": 0.9318750000093132,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:22:21 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"a83585b8-e774-4c4a-94e0-688d63672cc8\",\"state\":\"ARCHIVED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:22:21.971Z",
            "status": 200,
            "stepId": "archived",
            "truncated": false
          },
          "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
          "stateMappings": [],
          "stepId": "archived",
          "trialId": "2c661b50-21ea-4d93-baa8-cfc3f8874f57"
        },
        {
          "id": "ee1778ff-9ee7-4201-993b-4665ffbf7d35",
          "result": {
            "elapsedMs": 1.0626670000201557,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/documents/{documentId}/publish",
              "url": "http://127.0.0.1:54400/api/documents/a83585b8-e774-4c4a-94e0-688d63672cc8/publish"
            },
            "sanitizedResponse": {
              "body": {
                "id": "a83585b8-e774-4c4a-94e0-688d63672cc8",
                "state": "PUBLISHED"
              },
              "elapsedMs": 1.0626670000201557,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:22:21 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"a83585b8-e774-4c4a-94e0-688d63672cc8\",\"state\":\"PUBLISHED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:22:21.974Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "2c661b50-21ea-4d93-baa8-cfc3f8874f57"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "957c80c6-e9c5-47dd-a5f2-20c4968b0509",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
