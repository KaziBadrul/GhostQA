# GhostQA finding evidence

Finding: `75199a63-471c-455f-a6c6-0c11bb9aba70` — CONFIRMED
Evidence chain: OBSERVED VIOLATION → CONFIRMED → best verified reproducer.
Consistency: true. Artifact: GENERATED / UNVERIFIED.

Predicate: `df22ec7e-4027-429d-88f4-937f51e44e7a`, version 1, canonical hash `ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d`.
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

- EXPLORATION: evidence `1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61`, trial `f19d849d-1fcc-473d-8205-12fdd63c9a86`, baseline `ed2932bb-2124-4208-b8b9-a5b24984a173`, verdict VIOLATED.
- REPLAY: evidence `8177e71e-2826-46eb-9a44-0d67243358dc`, trial `8b11be4f-0ce5-4c99-9011-3fecb4846727`, baseline `5ef8481f-f843-47e5-a1c8-c5bfd71588d6`, verdict VIOLATED.

## Minimized reproduction

1. `create` — `POST /api/orders`
2. `cancelled` — `POST /api/orders/{orderId}/cancel`
3. `later` — `POST /api/orders/{orderId}/fulfill`

## Minimized attempt history

- Remove `create`: rejected; PRODUCER REQUIRED; candidate `c3d54479-7368-44d1-9a2a-b544000a9e73`.
- Remove `cancelled`: rejected; PREDICATE STEP REQUIRED; candidate `2ea72799-6cbb-41ef-ba05-e5c924df123b`.
- Remove `later`: rejected; PREDICATE STEP REQUIRED; candidate `906cf649-fb68-4b95-bc1d-b534d15c0a5d`.

## Setup and verification

Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.
Generation does not establish supervised verification. This manifest has not been verified through the originating run.

## Exact assertions and sanitized evidence

```json
{
  "approval": {
    "asOf": "2026-10-01T21:07:59.023Z",
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
    "id": "57ed92e2-de70-47e1-909e-d6d89a700b42",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
      "version": 1
    },
    "rationale": "Journey evaluating the lifecycle constraint where a cancelled order cannot subsequently be fulfilled.",
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
    "acceptedAt": "2026-10-01T21:07:59.023Z",
    "deadlineAt": "2026-10-01T21:17:59.023Z",
    "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
    "trialIds": [
      "f19d849d-1fcc-473d-8205-12fdd63c9a86",
      "8b11be4f-0ce5-4c99-9011-3fecb4846727"
    ]
  },
  "finding": {
    "classification": "CONFIRMED",
    "consistent": true,
    "id": "75199a63-471c-455f-a6c6-0c11bb9aba70",
    "initialEvidenceId": "1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61",
    "minimizationStop": "LOCAL MINIMUM",
    "minimizedJourneyId": "57ed92e2-de70-47e1-909e-d6d89a700b42",
    "originalJourneyId": "57ed92e2-de70-47e1-909e-d6d89a700b42",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
      "version": 1
    },
    "projectId": "3883e68b-d15a-40ac-bcf5-36aae6f304c5",
    "replayEvidenceIds": [
      "8177e71e-2826-46eb-9a44-0d67243358dc"
    ],
    "transitions": [
      {
        "evidenceRefs": [
          "1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61"
        ],
        "next": "OBSERVED VIOLATION",
        "prior": null,
        "reason": "INITIAL PREDICATE VIOLATION"
      },
      {
        "evidenceRefs": [
          "1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61",
          "8177e71e-2826-46eb-9a44-0d67243358dc"
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
        "fa303646-945c-4528-833b-ba0b23d653bd"
      ],
      "checkStepIds": [
        "baseline"
      ],
      "id": "ed2932bb-2124-4208-b8b9-a5b24984a173",
      "resetStepIds": [
        "reset"
      ],
      "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
      "trialId": "f19d849d-1fcc-473d-8205-12fdd63c9a86",
      "verdict": "SATISFIED"
    },
    "evidence": {
      "baselineEvidenceId": "ed2932bb-2124-4208-b8b9-a5b24984a173",
      "id": "1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61",
      "observationIds": [
        "b7826f84-d705-4e87-a266-f723548e3af7",
        "73b7215c-fe36-49bb-bd40-926160191da5",
        "4232ae37-c0da-4ea0-a837-45a3a052dabc"
      ],
      "outcome": "VIOLATED",
      "phase": "EXPLORATION",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
        "version": 1
      },
      "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
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
      "trialId": "f19d849d-1fcc-473d-8205-12fdd63c9a86"
    },
    "observations": [
      {
        "id": "b7826f84-d705-4e87-a266-f723548e3af7",
        "result": {
          "elapsedMs": 1.9827500000010332,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders",
            "url": "http://127.0.0.1:57754/api/orders"
          },
          "sanitizedResponse": {
            "body": {
              "id": "728e4a66-729b-4182-8539-952a072b0dea",
              "state": "CREATED"
            },
            "elapsedMs": 1.9827500000010332,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:02 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 201,
            "text": "{\"id\":\"728e4a66-729b-4182-8539-952a072b0dea\",\"state\":\"CREATED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:02.823Z",
          "status": 201,
          "stepId": "create",
          "truncated": false
        },
        "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
        "stateMappings": [],
        "stepId": "create",
        "trialId": "f19d849d-1fcc-473d-8205-12fdd63c9a86"
      },
      {
        "id": "4232ae37-c0da-4ea0-a837-45a3a052dabc",
        "result": {
          "elapsedMs": 1.2237089999998716,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/cancel",
            "url": "http://127.0.0.1:57754/api/orders/728e4a66-729b-4182-8539-952a072b0dea/cancel"
          },
          "sanitizedResponse": {
            "body": {
              "id": "728e4a66-729b-4182-8539-952a072b0dea",
              "state": "CANCELLED"
            },
            "elapsedMs": 1.2237089999998716,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:02 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"728e4a66-729b-4182-8539-952a072b0dea\",\"state\":\"CANCELLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:02.829Z",
          "status": 200,
          "stepId": "cancelled",
          "truncated": false
        },
        "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
        "stateMappings": [],
        "stepId": "cancelled",
        "trialId": "f19d849d-1fcc-473d-8205-12fdd63c9a86"
      },
      {
        "id": "73b7215c-fe36-49bb-bd40-926160191da5",
        "result": {
          "elapsedMs": 0.8462080000008427,
          "outcome": "RESPONSE",
          "sanitizedRequest": {
            "body": null,
            "headers": {},
            "operationId": "POST /api/orders/{orderId}/fulfill",
            "url": "http://127.0.0.1:57754/api/orders/728e4a66-729b-4182-8539-952a072b0dea/fulfill"
          },
          "sanitizedResponse": {
            "body": {
              "id": "728e4a66-729b-4182-8539-952a072b0dea",
              "state": "FULFILLED"
            },
            "elapsedMs": 0.8462080000008427,
            "headers": {
              "connection": "close",
              "content-type": "application/json",
              "date": "Thu, 01 Oct 2026 21:08:02 GMT",
              "transfer-encoding": "chunked"
            },
            "status": 200,
            "text": "{\"id\":\"728e4a66-729b-4182-8539-952a072b0dea\",\"state\":\"FULFILLED\"}",
            "truncated": false
          },
          "startedAt": "2026-10-01T21:08:02.833Z",
          "status": 200,
          "stepId": "later",
          "truncated": false
        },
        "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
        "stateMappings": [],
        "stepId": "later",
        "trialId": "f19d849d-1fcc-473d-8205-12fdd63c9a86"
      }
    ]
  },
  "minimization": {
    "attempts": [
      {
        "accepted": false,
        "candidate": {
          "dependencies": [],
          "id": "c3d54479-7368-44d1-9a2a-b544000a9e73",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
            "version": 1
          },
          "rationale": "Journey evaluating the lifecycle constraint where a cancelled order cannot subsequently be fulfilled.",
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
          "id": "2ea72799-6cbb-41ef-ba05-e5c924df123b",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
            "version": 1
          },
          "rationale": "Journey evaluating the lifecycle constraint where a cancelled order cannot subsequently be fulfilled.",
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
          "id": "906cf649-fb68-4b95-bc1d-b534d15c0a5d",
          "predicateRef": {
            "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
            "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
            "version": 1
          },
          "rationale": "Journey evaluating the lifecycle constraint where a cancelled order cannot subsequently be fulfilled.",
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
      "id": "57ed92e2-de70-47e1-909e-d6d89a700b42",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
        "version": 1
      },
      "rationale": "Journey evaluating the lifecycle constraint where a cancelled order cannot subsequently be fulfilled.",
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
      "id": "75199a63-471c-455f-a6c6-0c11bb9aba70",
      "initialEvidenceId": "1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61",
      "minimizationStop": "LOCAL MINIMUM",
      "minimizedJourneyId": "57ed92e2-de70-47e1-909e-d6d89a700b42",
      "originalJourneyId": "57ed92e2-de70-47e1-909e-d6d89a700b42",
      "predicateRef": {
        "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
        "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
        "version": 1
      },
      "projectId": "3883e68b-d15a-40ac-bcf5-36aae6f304c5",
      "replayEvidenceIds": [
        "8177e71e-2826-46eb-9a44-0d67243358dc"
      ],
      "transitions": [
        {
          "evidenceRefs": [
            "1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61"
          ],
          "next": "OBSERVED VIOLATION",
          "prior": null,
          "reason": "INITIAL PREDICATE VIOLATION"
        },
        {
          "evidenceRefs": [
            "1eb6f19d-aaba-4fb1-887d-8eaa4ad77c61",
            "8177e71e-2826-46eb-9a44-0d67243358dc"
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
    "id": "57ed92e2-de70-47e1-909e-d6d89a700b42",
    "predicateRef": {
      "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
      "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
      "version": 1
    },
    "rationale": "Journey evaluating the lifecycle constraint where a cancelled order cannot subsequently be fulfilled.",
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
    "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
    "source": "DEVELOPER",
    "sourceRef": "an order observed as CANCELLED must not later be observed as FULFILLED within the same fresh trial",
    "version": 1
  },
  "predicateRef": {
    "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
    "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
    "version": 1
  },
  "replays": [
    {
      "baseline": {
        "assertionIds": [
          "fa303646-945c-4528-833b-ba0b23d653bd"
        ],
        "checkStepIds": [
          "baseline"
        ],
        "id": "5ef8481f-f843-47e5-a1c8-c5bfd71588d6",
        "resetStepIds": [
          "reset"
        ],
        "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
        "trialId": "8b11be4f-0ce5-4c99-9011-3fecb4846727",
        "verdict": "SATISFIED"
      },
      "evidence": {
        "baselineEvidenceId": "5ef8481f-f843-47e5-a1c8-c5bfd71588d6",
        "id": "8177e71e-2826-46eb-9a44-0d67243358dc",
        "observationIds": [
          "5789e756-135f-47d4-a567-9f67ce3b1a2c",
          "1b111839-6fc2-4b7b-903e-3f1ebf679fcb",
          "adc5681d-c753-47ee-bb93-3eda4c73072a"
        ],
        "outcome": "VIOLATED",
        "phase": "REPLAY",
        "predicateRef": {
          "hash": "ba3ac6018756c461928b686fc8bf70282f0026508c86a9b5818e61d9135b493d",
          "id": "df22ec7e-4027-429d-88f4-937f51e44e7a",
          "version": 1
        },
        "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
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
        "trialId": "8b11be4f-0ce5-4c99-9011-3fecb4846727"
      },
      "observations": [
        {
          "id": "1b111839-6fc2-4b7b-903e-3f1ebf679fcb",
          "result": {
            "elapsedMs": 1.3662079999994603,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders",
              "url": "http://127.0.0.1:57754/api/orders"
            },
            "sanitizedResponse": {
              "body": {
                "id": "1cdd9c98-6f40-45ca-9e3a-43425649c0ab",
                "state": "CREATED"
              },
              "elapsedMs": 1.3662079999994603,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:02 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 201,
              "text": "{\"id\":\"1cdd9c98-6f40-45ca-9e3a-43425649c0ab\",\"state\":\"CREATED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:02.857Z",
            "status": 201,
            "stepId": "create",
            "truncated": false
          },
          "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
          "stateMappings": [],
          "stepId": "create",
          "trialId": "8b11be4f-0ce5-4c99-9011-3fecb4846727"
        },
        {
          "id": "adc5681d-c753-47ee-bb93-3eda4c73072a",
          "result": {
            "elapsedMs": 0.9162910000013653,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/cancel",
              "url": "http://127.0.0.1:57754/api/orders/1cdd9c98-6f40-45ca-9e3a-43425649c0ab/cancel"
            },
            "sanitizedResponse": {
              "body": {
                "id": "1cdd9c98-6f40-45ca-9e3a-43425649c0ab",
                "state": "CANCELLED"
              },
              "elapsedMs": 0.9162910000013653,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:02 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"1cdd9c98-6f40-45ca-9e3a-43425649c0ab\",\"state\":\"CANCELLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:02.860Z",
            "status": 200,
            "stepId": "cancelled",
            "truncated": false
          },
          "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
          "stateMappings": [],
          "stepId": "cancelled",
          "trialId": "8b11be4f-0ce5-4c99-9011-3fecb4846727"
        },
        {
          "id": "5789e756-135f-47d4-a567-9f67ce3b1a2c",
          "result": {
            "elapsedMs": 0.9073339999995369,
            "outcome": "RESPONSE",
            "sanitizedRequest": {
              "body": null,
              "headers": {},
              "operationId": "POST /api/orders/{orderId}/fulfill",
              "url": "http://127.0.0.1:57754/api/orders/1cdd9c98-6f40-45ca-9e3a-43425649c0ab/fulfill"
            },
            "sanitizedResponse": {
              "body": {
                "id": "1cdd9c98-6f40-45ca-9e3a-43425649c0ab",
                "state": "FULFILLED"
              },
              "elapsedMs": 0.9073339999995369,
              "headers": {
                "connection": "close",
                "content-type": "application/json",
                "date": "Thu, 01 Oct 2026 21:08:02 GMT",
                "transfer-encoding": "chunked"
              },
              "status": 200,
              "text": "{\"id\":\"1cdd9c98-6f40-45ca-9e3a-43425649c0ab\",\"state\":\"FULFILLED\"}",
              "truncated": false
            },
            "startedAt": "2026-10-01T21:08:02.863Z",
            "status": 200,
            "stepId": "later",
            "truncated": false
          },
          "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
          "stateMappings": [],
          "stepId": "later",
          "trialId": "8b11be4f-0ce5-4c99-9011-3fecb4846727"
        }
      ]
    }
  ],
  "reproductionClaim": "shortest verified sequence found",
  "runId": "472fa724-b0c8-4e33-bd30-2a120582f957",
  "setup": "Supply explicit target/address/operation approval, mutation acknowledgment, finite limits and credential slots separately. A standalone runner is not included in this manifest-only export.",
  "stopReason": "LOCAL MINIMUM",
  "truncated": false,
  "verification": "UNVERIFIED"
}
```
