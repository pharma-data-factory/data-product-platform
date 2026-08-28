from app.main import PublishBatch, PublishMessage


def test_publish_batch_model_accepts_uns_envelope():
    body = PublishBatch(
        messages=[
            PublishMessage(
                topic="uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/CHECKWEIGHER-01/state",
                message={
                    "schemaVersion": "1.0",
                    "equipmentId": "CHECKWEIGHER-01",
                    "payload": {"state": "MICROSTOP", "reasonCode": "PRODUCT_JAM"},
                },
                qos=1,
                retain=True,
            )
        ]
    )
    assert len(body.messages) == 1
    assert "CHECKWEIGHER-01" in body.messages[0].topic
