# GhostQA finding evidence

Finding: `9f81f908-000f-4a65-ae1a-560524adcd7a` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `a120fb53-0853-4626-a9fb-d41e7108941c`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `fe8d7bcc-7050-46c6-a677-d251f52d1532`, trial `ef6a7648-7c45-43ca-9ffb-6d776ef1d01b`, baseline `9ef10418-75f1-45ba-9189-693375a6c54c`, verdict VIOLATED.
- REPLAY: evidence `b51ecf41-b539-43b3-b666-d70390138522`, trial `3027fe66-7317-44b5-a166-c8495b590da6`, baseline `a6bacef1-e1bc-43b4-b229-2e2c2ed593b4`, verdict VIOLATED.

## Minimized reproduction

1. `step1` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `step1`: rejected; PRODUCER REQUIRED; candidate `e6998aad-757f-46af-acb6-7379b0c3b490`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `60adc2a7-69fa-4036-b87b-c4861d96a68f`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `7620ea2e-ce84-45ba-9902-867b245af91a`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T22:18:28.638Z",
    "eligible": true,
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial"
  },
  "bestJourney": {
    "dependencies": [
      {
        "consumer": "cancelled",
        "producer": "step1",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "step1",
        "variable": "orderId"
      }
    ],
    "id": "c05d034a-0697-4ec4-a3e4-ec578650b84e",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
      "version": 1
    },
    "rationale": "Validating that a cancelled order cannot be fulfilled.",
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
              "stepId": "step1"
            }
          }
        ],
        "id": "step1",
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
              "stepId": "step1"
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
              "stepId": "step1"
            }
          }
        ]
      }
    ],
    "variables": []
  },
  "bestLength": 3,
  "executionProvenance": {
    "acceptedAt": "2026-10-01T22:18:28.638Z",
    "deadlineAt": "2026-10-01T22:28:28.638Z",
    "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
    "trialIds": [
      "ef6a7648-7c45-43ca-9ffb-6d776ef1d01b",
      "3027fe66-7317-44b5-a166-c8495b590da6"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "9f81f908-000f-4a65-ae1a-560524adcd7a",
    "initialEvidenceId": "fe8d7bcc-7050-46c6-a677-d251f52d1532",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "c05d034a-0697-4ec4-a3e4-ec578650b84e",
    "originalJourneyId": "c05d034a-0697-4ec4-a3e4-ec578650b84e",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
      "version": 1
    },
    "projectId": "d078db29-9e93-40e2-acfc-57899a9743e9",
    "replayEvidenceIds": [
      "b51ecf41-b539-43b3-b666-d70390138522"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "fe8d7bcc-7050-46c6-a677-d251f52d1532"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "fe8d7bcc-7050-46c6-a677-d251f52d1532",
          "b51ecf41-b539-43b3-b666-d70390138522"
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
        "6717dfc3-3fb9-4e82-aae1-13ca495a262b"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "9ef10418-75f1-45ba-9189-693375a6c54c",
      "resetStepIds": [
        "reset"
      ],
      "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
      "trialId": "ef6a7648-7c45-43ca-9ffb-6d776ef1d01b",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "9ef10418-75f1-45ba-9189-693375a6c54c",
      "id": "fe8d7bcc-7050-46c6-a677-d251f52d1532",
      "observationIds": [
        "2963dce6-28d3-4ea0-9656-9039e8049560",
        "884a1393-3a5c-45c2-9e47-47a19ca287d5",
        "2392c14d-85cb-4a09-b1ba-bc8cd848a2cd"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
        "version": 1
      },
      "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
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
            "stepId": "step1"
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
      "trialId": "ef6a7648-7c45-43ca-9ffb-6d776ef1d01b"
    },
    "observations": [
      {
        "id": "884a1393-3a5c-45c2-9e47-47a19ca287d5",
        "result": {
          "elapsedMs": 1.8266249999996944,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:54049/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "7940bc97-7d77-4694-a9bf-6e40916a089c",
              "state": "CREATED"
            },
            "elapsedMs": 1.8266249999996944,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:32 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"7940bc97-7d77-4694-a9bf-6e40916a089c\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:32.506Z",
          "status": 201,
          "stepId": "step1",
          "truncated": false
        },
        "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
        "stateMappings": [],
        "stepId": "step1",
        "trialId": "ef6a7648-7c45-43ca-9ffb-6d776ef1d01b"
      },
      {
        "id": "2392c14d-85cb-4a09-b1ba-bc8cd848a2cd",
        "result": {
          "elapsedMs": 1.9560419999997976,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:54049/api/orders/7940bc97-7d77-4694-a9bf-6e40916a089c/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "7940bc97-7d77-4694-a9bf-6e40916a089c",
              "state": "CANCELLED"
            },
            "elapsedMs": 1.9560419999997976,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:32 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"7940bc97-7d77-4694-a9bf-6e40916a089c\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:32.537Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "ef6a7648-7c45-43ca-9ffb-6d776ef1d01b"
      },
      {
        "id": "2963dce6-28d3-4ea0-9656-9039e8049560",
        "result": {
          "elapsedMs": 2.9307079999998678,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:54049/api/orders/7940bc97-7d77-4694-a9bf-6e40916a089c/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "7940bc97-7d77-4694-a9bf-6e40916a089c",
              "state": "FULFILLED"
            },
            "elapsedMs": 2.9307079999998678,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 22:18:32 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"7940bc97-7d77-4694-a9bf-6e40916a089c\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T22:18:32.545Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "ef6a7648-7c45-43ca-9ffb-6d776ef1d01b"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "e6998aad-757f-46af-acb6-7379b0c3b490",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
            "version": 1
          },
          "rationale": "Validating that a cancelled order cannot be fulfilled.",
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
                    "stepId": "step1"
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
                    "stepId": "step1"
                  }
                }
              ]
            }
          ],
          "variables": []
        },
        "observations": [],
        "reason": "PRODUCER REQUIRED",
        "removedStepId": "step1"
      },
      {
        "accepted": false,
        "candidate": {
          "dependencies": [
            {
              "consumer": "later",
              "producer": "step1",
              "variable": "orderId"
            }
          ],
          "id": "60adc2a7-69fa-4036-b87b-c4861d96a68f",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
            "version": 1
          },
          "rationale": "Validating that a cancelled order cannot be fulfilled.",
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
                    "stepId": "step1"
                  }
                }
              ],
              "id": "step1",
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
                    "stepId": "step1"
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
              "producer": "step1",
              "variable": "orderId"
            }
          ],
          "id": "7620ea2e-ce84-45ba-9902-867b245af91a",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
            "version": 1
          },
          "rationale": "Validating that a cancelled order cannot be fulfilled.",
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
                    "stepId": "step1"
                  }
                }
              ],
              "id": "step1",
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
                    "stepId": "step1"
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
          "producer": "step1",
          "variable": "orderId"
        },
        {
          "consumer": "later",
          "producer": "step1",
          "variable": "orderId"
        }
      ],
      "id": "c05d034a-0697-4ec4-a3e4-ec578650b84e",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
        "version": 1
      },
      "rationale": "Validating that a cancelled order cannot be fulfilled.",
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
                "stepId": "step1"
              }
            }
          ],
          "id": "step1",
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
                "stepId": "step1"
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
                "stepId": "step1"
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
      "id": "9f81f908-000f-4a65-ae1a-560524adcd7a",
      "initialEvidenceId": "fe8d7bcc-7050-46c6-a677-d251f52d1532",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "c05d034a-0697-4ec4-a3e4-ec578650b84e",
      "originalJourneyId": "c05d034a-0697-4ec4-a3e4-ec578650b84e",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
        "version": 1
      },
      "projectId": "d078db29-9e93-40e2-acfc-57899a9743e9",
      "replayEvidenceIds": [
        "b51ecf41-b539-43b3-b666-d70390138522"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "fe8d7bcc-7050-46c6-a677-d251f52d1532"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "fe8d7bcc-7050-46c6-a677-d251f52d1532",
            "b51ecf41-b539-43b3-b666-d70390138522"
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
        "producer": "step1",
        "variable": "orderId"
      },
      {
        "consumer": "later",
        "producer": "step1",
        "variable": "orderId"
      }
    ],
    "id": "c05d034a-0697-4ec4-a3e4-ec578650b84e",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
      "version": 1
    },
    "rationale": "Validating that a cancelled order cannot be fulfilled.",
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
              "stepId": "step1"
            }
          }
        ],
        "id": "step1",
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
              "stepId": "step1"
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
              "stepId": "step1"
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
    "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "6717dfc3-3fb9-4e82-aae1-13ca495a262b"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "a6bacef1-e1bc-43b4-b229-2e2c2ed593b4",
        "resetStepIds": [
          "reset"
        ],
        "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
        "trialId": "3027fe66-7317-44b5-a166-c8495b590da6",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "a6bacef1-e1bc-43b4-b229-2e2c2ed593b4",
        "id": "b51ecf41-b539-43b3-b666-d70390138522",
        "observationIds": [
          "d9d4a398-16c0-4afc-bce1-e9bdb69f199a",
          "68d01b4a-ec5e-4649-a9ee-e227520b24e5",
          "ca795df7-da51-4ff7-852e-08709273e0cf"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "a120fb53-0853-4626-a9fb-d41e7108941c",
          "version": 1
        },
        "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
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
              "stepId": "step1"
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
        "trialId": "3027fe66-7317-44b5-a166-c8495b590da6"
      },
      "observations": [
        {
          "id": "ca795df7-da51-4ff7-852e-08709273e0cf",
          "result": {
            "elapsedMs": 1.0687500000003638,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:54049/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "f5088e2a-5aa4-4141-a042-52ba303df93b",
                "state": "CREATED"
              },
              "elapsedMs": 1.0687500000003638,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:32 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"f5088e2a-5aa4-4141-a042-52ba303df93b\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:32.581Z",
            "status": 201,
            "stepId": "step1",
            "truncated": false
          },
          "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
          "stateMappings": [],
          "stepId": "step1",
          "trialId": "3027fe66-7317-44b5-a166-c8495b590da6"
        },
        {
          "id": "68d01b4a-ec5e-4649-a9ee-e227520b24e5",
          "result": {
            "elapsedMs": 1.112583000000086,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:54049/api/orders/f5088e2a-5aa4-4141-a042-52ba303df93b/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "f5088e2a-5aa4-4141-a042-52ba303df93b",
                "state": "CANCELLED"
              },
              "elapsedMs": 1.112583000000086,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:32 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"f5088e2a-5aa4-4141-a042-52ba303df93b\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:32.585Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "3027fe66-7317-44b5-a166-c8495b590da6"
        },
        {
          "id": "d9d4a398-16c0-4afc-bce1-e9bdb69f199a",
          "result": {
            "elapsedMs": 1.4865420000005543,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:54049/api/orders/f5088e2a-5aa4-4141-a042-52ba303df93b/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "f5088e2a-5aa4-4141-a042-52ba303df93b",
                "state": "FULFILLED"
              },
              "elapsedMs": 1.4865420000005543,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 22:18:32 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"f5088e2a-5aa4-4141-a042-52ba303df93b\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T22:18:32.588Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "3027fe66-7317-44b5-a166-c8495b590da6"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "f2b1439b-c200-4cd7-a15c-15067efe1ac8",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
