# GhostQA finding evidence

Finding: `eb80542e-ce40-4ac9-8926-ed6c648c4a54` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `a692af1d-b9ee-4fc7-aa9c-0731679b9d69`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
Approval provenance: DEVELOPER; source `an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial`; eligible as of run acceptance: true.

Original journey length: 3. Best verified journey length: 3.
This is the shortest verified sequence found.
It is locally irreducible under attempted deletion strategy.
Local minimization stop reason: LOCAL MINIMUM.
Truncated: no.

## Expected invariant

When the applicability conditions hold, every approved assertion must be satisfied:

- `{"kind":"json","pointer":"/state","stepId":"later"}` not-equals `{"kind":"literal","value":"FULFILLED"}`

## Evidence references

- EXPLORATION: evidence `88eec569-ee3d-41f4-9c33-3a9162f3f86d`, trial `7b1d175c-740b-4a94-a248-a0c6a877ef05`, baseline `a34587e9-ea64-4c10-b849-4f786f1a4df3`, verdict VIOLATED.
- REPLAY: evidence `715300fa-1858-45ea-baf6-60ebb0a726d6`, trial `c535463a-99da-4325-bf0d-29efef9af4b7`, baseline `11d33581-6b2a-4b72-a9bc-e48b6eb47b34`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `d5eebe1c-40e3-4b5f-9311-92129cf8c747`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `e953da20-822a-49ca-b6c1-7fb785e23134`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `74769bef-dbb5-436c-9810-4dae01860e20`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:18:38.187Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "cancelled",
        "producer": "create",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "orderId"
      }
    ],
    "id": "e590220a-5ce1-4624-a72d-e2305f269293",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
      "version": 1
    },
    "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled, confirming state transition constraints.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "orderId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
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
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
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
    "acceptedAt": "2026-10-01T22:18:38.187Z",
    "deadlineAt": "2026-10-01T22:28:38.187Z",
    "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
    "trialIds": [
      "7b1d175c-740b-4a94-a248-a0c6a877ef05",
      "c535463a-99da-4325-bf0d-29efef9af4b7"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "eb80542e-ce40-4ac9-8926-ed6c648c4a54",
    "initialEvidenceId": "88eec569-ee3d-41f4-9c33-3a9162f3f86d",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "e590220a-5ce1-4624-a72d-e2305f269293",
    "originalJourneyId": "e590220a-5ce1-4624-a72d-e2305f269293",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
      "version": 1
    },
    "projectId": "ddb1e669-86fc-486b-bb63-0f6396191eca",
    "replayEvidenceIds": [
      "715300fa-1858-45ea-baf6-60ebb0a726d6"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "88eec569-ee3d-41f4-9c33-3a9162f3f86d"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "88eec569-ee3d-41f4-9c33-3a9162f3f86d",
          "715300fa-1858-45ea-baf6-60ebb0a726d6"
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
        "8897a81b-19f6-4ff6-8aa9-2e6ab90d0cce"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "a34587e9-ea64-4c10-b849-4f786f1a4df3",
      "resetStepIds": [
        "reset"
      ],
      "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
      "trialId": "7b1d175c-740b-4a94-a248-a0c6a877ef05",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "a34587e9-ea64-4c10-b849-4f786f1a4df3",
      "id": "88eec569-ee3d-41f4-9c33-3a9162f3f86d",
      "observationIds": [
        "16a1ea53-6add-4362-b543-7c4a83ef66ab",
        "76dbbe5e-d333-4671-8737-9e7cc521aa37",
        "c30bcc5a-efbc-49cf-9385-e2e82f4f7dfb"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
        "version": 1
      },
      "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
      "symbolicOperands": {
        "applicability": [
          {
            "left": {
              "kind": "json",
              "pointer": "/state",
              "stepId": "cancelled"
            },
            "op": "equals",
            "right": {
              "kind": "literal",
              "value": "CANCELLED"
            }
          },
          {
            "left": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "cancelled"
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
              "stepId": "cancelled"
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
              "value": "FULFILLED"
            }
          }
        ],
        "executionOrder": [
          {
            "operationId": "POST /api/orders",
            "ordinal": 0,
            "stepId": "create"
          },
          {
            "operationId": "POST /api/orders/{orderId}/cancel",
            "ordinal": 1,
            "stepId": "cancelled"
          },
          {
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "ordinal": 2,
            "stepId": "later"
          }
        ]
      },
      "trialId": "7b1d175c-740b-4a94-a248-a0c6a877ef05"
    },
    "observations": [
      {
        "id": "76dbbe5e-d333-4671-8737-9e7cc521aa37",
        "result": {
          "elapsedMs": 1.2014589999998861,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:54088/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "5e87a73b-2355-4a25-9208-1910d07778cc",
              "state": "CREATED"
            },
            "elapsedMs": 1.2014589999998861,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:42 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"5e87a73b-2355-4a25-9208-1910d07778cc\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:42.127Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "7b1d175c-740b-4a94-a248-a0c6a877ef05"
      },
      {
        "id": "c30bcc5a-efbc-49cf-9385-e2e82f4f7dfb",
        "result": {
          "elapsedMs": 1.0672500000000582,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:54088/api/orders/5e87a73b-2355-4a25-9208-1910d07778cc/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "5e87a73b-2355-4a25-9208-1910d07778cc",
              "state": "CANCELLED"
            },
            "elapsedMs": 1.0672500000000582,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:42 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"5e87a73b-2355-4a25-9208-1910d07778cc\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:42.132Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "7b1d175c-740b-4a94-a248-a0c6a877ef05"
      },
      {
        "id": "16a1ea53-6add-4362-b543-7c4a83ef66ab",
        "result": {
          "elapsedMs": 1.3130000000001019,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:54088/api/orders/5e87a73b-2355-4a25-9208-1910d07778cc/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "5e87a73b-2355-4a25-9208-1910d07778cc",
              "state": "FULFILLED"
            },
            "elapsedMs": 1.3130000000001019,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:42 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"5e87a73b-2355-4a25-9208-1910d07778cc\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:42.135Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "7b1d175c-740b-4a94-a248-a0c6a877ef05"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "d5eebe1c-40e3-4b5f-9311-92129cf8c747",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled, confirming state transition constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
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
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
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
              "variable": "orderId"
            }
          ],
          "id": "e953da20-822a-49ca-b6c1-7fb785e23134",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled, confirming state transition constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "orderId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                409
              ],
              "extracts": [],
              "id": "later",
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
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
        "removedStepId": "cancelled"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "cancelled",
              "producer": "create",
              "variable": "orderId"
            }
          ],
          "id": "74769bef-dbb5-436c-9810-4dae01860e20",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
            "version": 1
          },
          "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled, confirming state transition constraints.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                201
              ],
              "extracts": [
                {
                  "expectedType": "string",
                  "name": "orderId",
                  "sensitive": false,
                  "source": {
                    "kind": "json",
                    "pointer": "/id",
                    "stepId": "create"
                  }
                }
              ],
              "id": "create",
              "operationId": "POST /api/orders",
              "parameters": []
            },
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
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
          "consumer": "cancelled",
          "producer": "create",
          "variable": "orderId"
        },
        {
          "consumer": "later",
          "producer": "create",
          "variable": "orderId"
        }
      ],
      "id": "e590220a-5ce1-4624-a72d-e2305f269293",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
        "version": 1
      },
      "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled, confirming state transition constraints.",
      "steps": [
        {
          "bodyBindings": [],
          "expectedStatuses": [
            201
          ],
          "extracts": [
            {
              "expectedType": "string",
              "name": "orderId",
              "sensitive": false,
              "source": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "create"
              }
            }
          ],
          "id": "create",
          "operationId": "POST /api/orders",
          "parameters": []
        },
        {
          "bodyBindings": [],
          "expectedStatuses": [
            200
          ],
          "extracts": [],
          "id": "cancelled",
          "operationId": "POST /api/orders/{orderId}/cancel",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
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
            409
          ],
          "extracts": [],
          "id": "later",
          "operationId": "POST /api/orders/{orderId}/fulfill",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
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
      "id": "eb80542e-ce40-4ac9-8926-ed6c648c4a54",
      "initialEvidenceId": "88eec569-ee3d-41f4-9c33-3a9162f3f86d",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "e590220a-5ce1-4624-a72d-e2305f269293",
      "originalJourneyId": "e590220a-5ce1-4624-a72d-e2305f269293",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
        "version": 1
      },
      "projectId": "ddb1e669-86fc-486b-bb63-0f6396191eca",
      "replayEvidenceIds": [
        "715300fa-1858-45ea-baf6-60ebb0a726d6"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "88eec569-ee3d-41f4-9c33-3a9162f3f86d"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "88eec569-ee3d-41f4-9c33-3a9162f3f86d",
            "715300fa-1858-45ea-baf6-60ebb0a726d6"
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
        "consumer": "cancelled",
        "producer": "create",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "create",
        "variable": "orderId"
      }
    ],
    "id": "e590220a-5ce1-4624-a72d-e2305f269293",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
      "version": 1
    },
    "rationale": "Verifies that an order observed as CANCELLED cannot later be fulfilled, confirming state transition constraints.",
    "steps": [
      {
        "bodyBindings": [],
        "expectedStatuses": [
          201
        ],
        "extracts": [
          {
            "expectedType": "string",
            "name": "orderId",
            "sensitive": false,
            "source": {
              "kind": "json",
              "pointer": "/id",
              "stepId": "create"
            }
          }
        ],
        "id": "create",
        "operationId": "POST /api/orders",
        "parameters": []
      },
      {
        "bodyBindings": [],
        "expectedStatuses": [
          200
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
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
          409
        ],
        "extracts": [],
        "id": "later",
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
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
          "stepId": "cancelled"
        },
        "op": "equals",
        "right": {
          "kind": "literal",
          "value": "CANCELLED"
        }
      },
      {
        "left": {
          "kind": "json",
          "pointer": "/id",
          "stepId": "cancelled"
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
          "stepId": "cancelled"
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
          "value": "FULFILLED"
        }
      }
    ],
    "canonicalHash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "8897a81b-19f6-4ff6-8aa9-2e6ab90d0cce"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "11d33581-6b2a-4b72-a9bc-e48b6eb47b34",
        "resetStepIds": [
          "reset"
        ],
        "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
        "trialId": "c535463a-99da-4325-bf0d-29efef9af4b7",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "11d33581-6b2a-4b72-a9bc-e48b6eb47b34",
        "id": "715300fa-1858-45ea-baf6-60ebb0a726d6",
        "observationIds": [
          "ab1252fa-39ad-4bda-a4f0-044aa7ae26c2",
          "7e7b8602-c4d8-4d5b-8908-888d42cbfb3b",
          "22436a0b-10f4-4794-81e3-e0a0c52dfa61"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "a692af1d-b9ee-4fc7-aa9c-0731679b9d69",
          "version": 1
        },
        "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
        "symbolicOperands": {
          "applicability": [
            {
              "left": {
                "kind": "json",
                "pointer": "/state",
                "stepId": "cancelled"
              },
              "op": "equals",
              "right": {
                "kind": "literal",
                "value": "CANCELLED"
              }
            },
            {
              "left": {
                "kind": "json",
                "pointer": "/id",
                "stepId": "cancelled"
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
                "stepId": "cancelled"
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
                "value": "FULFILLED"
              }
            }
          ],
          "executionOrder": [
            {
              "operationId": "POST /api/orders",
              "ordinal": 0,
              "stepId": "create"
            },
            {
              "operationId": "POST /api/orders/{orderId}/cancel",
              "ordinal": 1,
              "stepId": "cancelled"
            },
            {
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "ordinal": 2,
              "stepId": "later"
            }
          ]
        },
        "trialId": "c535463a-99da-4325-bf0d-29efef9af4b7"
      },
      "observations": [
        {
          "id": "ab1252fa-39ad-4bda-a4f0-044aa7ae26c2",
          "result": {
            "elapsedMs": 1.0204159999993863,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:54088/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a",
                "state": "CREATED"
              },
              "elapsedMs": 1.0204159999993863,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:42 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:42.160Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "c535463a-99da-4325-bf0d-29efef9af4b7"
        },
        {
          "id": "7e7b8602-c4d8-4d5b-8908-888d42cbfb3b",
          "result": {
            "elapsedMs": 0.7745840000006865,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:54088/api/orders/f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a",
                "state": "CANCELLED"
              },
              "elapsedMs": 0.7745840000006865,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:42 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:42.162Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "c535463a-99da-4325-bf0d-29efef9af4b7"
        },
        {
          "id": "22436a0b-10f4-4794-81e3-e0a0c52dfa61",
          "result": {
            "elapsedMs": 1.811333999999988,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:54088/api/orders/f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a",
                "state": "FULFILLED"
              },
              "elapsedMs": 1.811333999999988,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:42 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"f1fa6afa-45d2-4f4c-b4b6-6f7e4ab4ef2a\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:42.165Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "c535463a-99da-4325-bf0d-29efef9af4b7"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "2badc0de-49b1-4e65-a4eb-67f08064f65c",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
