# GhostQA finding evidence

Finding: `3cc5635b-18d7-4f19-ad6a-879181f33cc7` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `12745fa0-afc2-41c5-bb05-f610b3219099`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `b3c43b0a-bed0-489d-8d10-a6937494302c`, trial `dcb22de4-dd8e-4d85-aa8a-0c87fe031185`, baseline `078452c6-2e45-40f1-abd9-b709afc0565a`, verdict VIOLATED.
- REPLAY: evidence `4a80ce01-7216-4e7f-9631-cf0241d4b850`, trial `8456a3da-ecad-4964-b498-a7b54b87daab`, baseline `d2535322-b9ef-4229-9f32-2568d923bc23`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `e641a228-1d07-471e-9274-8454466c2c6a`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `610c2ba2-86a8-48c1-a563-5fbbd885a922`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `5d73ad76-ebad-4419-b577-5f315920bc81`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:04:43.539Z",
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
    "id": "a1781b6e-5659-4f08-b5da-9920ee943478",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
      "version": 1
    },
    "rationale": "Journey to verify an order cancelled state cannot transition to fulfilled.",
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
          200,
          409
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
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
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T22:04:43.539Z",
    "deadlineAt": "2026-10-01T22:14:43.539Z",
    "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
    "trialIds": [
      "dcb22de4-dd8e-4d85-aa8a-0c87fe031185",
      "8456a3da-ecad-4964-b498-a7b54b87daab"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "3cc5635b-18d7-4f19-ad6a-879181f33cc7",
    "initialEvidenceId": "b3c43b0a-bed0-489d-8d10-a6937494302c",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "a1781b6e-5659-4f08-b5da-9920ee943478",
    "originalJourneyId": "a1781b6e-5659-4f08-b5da-9920ee943478",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
      "version": 1
    },
    "projectId": "66f7cfc4-77fc-488e-a1de-c7b582d97584",
    "replayEvidenceIds": [
      "4a80ce01-7216-4e7f-9631-cf0241d4b850"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "b3c43b0a-bed0-489d-8d10-a6937494302c"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "b3c43b0a-bed0-489d-8d10-a6937494302c",
          "4a80ce01-7216-4e7f-9631-cf0241d4b850"
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
        "cf9d5c58-05f3-4090-945f-ae12ffe4e93f"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "078452c6-2e45-40f1-abd9-b709afc0565a",
      "resetStepIds": [
        "reset"
      ],
      "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
      "trialId": "dcb22de4-dd8e-4d85-aa8a-0c87fe031185",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "078452c6-2e45-40f1-abd9-b709afc0565a",
      "id": "b3c43b0a-bed0-489d-8d10-a6937494302c",
      "observationIds": [
        "29afc127-96e0-4e2a-992b-cb4ed00666ac",
        "0ed3da89-5db8-4209-be82-2718e1af4c54",
        "59ccf541-689d-4fcd-a098-9c08d7352c07"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
        "version": 1
      },
      "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
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
      "trialId": "dcb22de4-dd8e-4d85-aa8a-0c87fe031185"
    },
    "observations": [
      {
        "id": "0ed3da89-5db8-4209-be82-2718e1af4c54",
        "result": {
          "elapsedMs": 2.262917000000016,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:52758/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d789912e-774f-400e-b595-b4e6c4bf7058",
              "state": "CREATED"
            },
            "elapsedMs": 2.262917000000016,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:04:48 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"d789912e-774f-400e-b595-b4e6c4bf7058\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:04:48.017Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "dcb22de4-dd8e-4d85-aa8a-0c87fe031185"
      },
      {
        "id": "59ccf541-689d-4fcd-a098-9c08d7352c07",
        "result": {
          "elapsedMs": 2.7483750000001237,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:52758/api/orders/d789912e-774f-400e-b595-b4e6c4bf7058/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d789912e-774f-400e-b595-b4e6c4bf7058",
              "state": "CANCELLED"
            },
            "elapsedMs": 2.7483750000001237,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:04:48 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d789912e-774f-400e-b595-b4e6c4bf7058\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:04:48.058Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "dcb22de4-dd8e-4d85-aa8a-0c87fe031185"
      },
      {
        "id": "29afc127-96e0-4e2a-992b-cb4ed00666ac",
        "result": {
          "elapsedMs": 3.2269999999998618,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:52758/api/orders/d789912e-774f-400e-b595-b4e6c4bf7058/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "d789912e-774f-400e-b595-b4e6c4bf7058",
              "state": "FULFILLED"
            },
            "elapsedMs": 3.2269999999998618,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:04:48 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"d789912e-774f-400e-b595-b4e6c4bf7058\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:04:48.076Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "dcb22de4-dd8e-4d85-aa8a-0c87fe031185"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "e641a228-1d07-471e-9274-8454466c2c6a",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
            "version": 1
          },
          "rationale": "Journey to verify an order cancelled state cannot transition to fulfilled.",
          "steps": [
            {
              "bodyBindings": [],
              "expectedStatuses": [
                200,
                409
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
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
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
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
          "id": "610c2ba2-86a8-48c1-a563-5fbbd885a922",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
            "version": 1
          },
          "rationale": "Journey to verify an order cancelled state cannot transition to fulfilled.",
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
                200,
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
                    "kind": "variable",
                    "name": "orderId"
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
          "id": "5d73ad76-ebad-4419-b577-5f315920bc81",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
            "version": 1
          },
          "rationale": "Journey to verify an order cancelled state cannot transition to fulfilled.",
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
                200,
                409
              ],
              "extracts": [],
              "id": "cancelled",
              "operationId": "POST /api/orders/{orderId}/cancel",
              "parameters": [
                {
                  "location": "path",
                  "name": "orderId",
                  "value": {
                    "kind": "variable",
                    "name": "orderId"
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
      "id": "a1781b6e-5659-4f08-b5da-9920ee943478",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
        "version": 1
      },
      "rationale": "Journey to verify an order cancelled state cannot transition to fulfilled.",
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
            200,
            409
          ],
          "extracts": [],
          "id": "cancelled",
          "operationId": "POST /api/orders/{orderId}/cancel",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "variable",
                "name": "orderId"
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
          "operationId": "POST /api/orders/{orderId}/fulfill",
          "parameters": [
            {
              "location": "path",
              "name": "orderId",
              "value": {
                "kind": "variable",
                "name": "orderId"
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
      "id": "3cc5635b-18d7-4f19-ad6a-879181f33cc7",
      "initialEvidenceId": "b3c43b0a-bed0-489d-8d10-a6937494302c",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "a1781b6e-5659-4f08-b5da-9920ee943478",
      "originalJourneyId": "a1781b6e-5659-4f08-b5da-9920ee943478",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
        "version": 1
      },
      "projectId": "66f7cfc4-77fc-488e-a1de-c7b582d97584",
      "replayEvidenceIds": [
        "4a80ce01-7216-4e7f-9631-cf0241d4b850"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "b3c43b0a-bed0-489d-8d10-a6937494302c"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "b3c43b0a-bed0-489d-8d10-a6937494302c",
            "4a80ce01-7216-4e7f-9631-cf0241d4b850"
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
    "id": "a1781b6e-5659-4f08-b5da-9920ee943478",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
      "version": 1
    },
    "rationale": "Journey to verify an order cancelled state cannot transition to fulfilled.",
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
          200,
          409
        ],
        "extracts": [],
        "id": "cancelled",
        "operationId": "POST /api/orders/{orderId}/cancel",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
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
        "operationId": "POST /api/orders/{orderId}/fulfill",
        "parameters": [
          {
            "location": "path",
            "name": "orderId",
            "value": {
              "kind": "variable",
              "name": "orderId"
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
    "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "cf9d5c58-05f3-4090-945f-ae12ffe4e93f"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "d2535322-b9ef-4229-9f32-2568d923bc23",
        "resetStepIds": [
          "reset"
        ],
        "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
        "trialId": "8456a3da-ecad-4964-b498-a7b54b87daab",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "d2535322-b9ef-4229-9f32-2568d923bc23",
        "id": "4a80ce01-7216-4e7f-9631-cf0241d4b850",
        "observationIds": [
          "1089845e-ac5b-4c91-80e3-97e5ac786792",
          "c2ad4fb1-8358-4e31-81b0-24d249c5b30b",
          "8ce6c58b-d01a-4e01-b44e-77335ac08d3d"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "12745fa0-afc2-41c5-bb05-f610b3219099",
          "version": 1
        },
        "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
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
        "trialId": "8456a3da-ecad-4964-b498-a7b54b87daab"
      },
      "observations": [
        {
          "id": "1089845e-ac5b-4c91-80e3-97e5ac786792",
          "result": {
            "elapsedMs": 3.327624999999898,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:52758/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "b4073acd-c302-4604-af03-d7a5dc13d14c",
                "state": "CREATED"
              },
              "elapsedMs": 3.327624999999898,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:04:48 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"b4073acd-c302-4604-af03-d7a5dc13d14c\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:04:48.337Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "8456a3da-ecad-4964-b498-a7b54b87daab"
        },
        {
          "id": "8ce6c58b-d01a-4e01-b44e-77335ac08d3d",
          "result": {
            "elapsedMs": 4.016333999999915,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:52758/api/orders/b4073acd-c302-4604-af03-d7a5dc13d14c/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "b4073acd-c302-4604-af03-d7a5dc13d14c",
                "state": "CANCELLED"
              },
              "elapsedMs": 4.016333999999915,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:04:48 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"b4073acd-c302-4604-af03-d7a5dc13d14c\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:04:48.357Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "8456a3da-ecad-4964-b498-a7b54b87daab"
        },
        {
          "id": "c2ad4fb1-8358-4e31-81b0-24d249c5b30b",
          "result": {
            "elapsedMs": 6.202916999999616,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:52758/api/orders/b4073acd-c302-4604-af03-d7a5dc13d14c/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "b4073acd-c302-4604-af03-d7a5dc13d14c",
                "state": "FULFILLED"
              },
              "elapsedMs": 6.202916999999616,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:04:48 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"b4073acd-c302-4604-af03-d7a5dc13d14c\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:04:48.375Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "8456a3da-ecad-4964-b498-a7b54b87daab"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "35287f8c-0537-428d-a0df-4918dc3bf8d9",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
