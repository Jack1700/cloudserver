import assert from 'assert';
import bucketPut from '../../../lib/api/bucketPut.js';
import bucketPutACL from '../../../lib/api/bucketPutACL.js';
import metadata from '../metadataswitch';
import utils from '../../../lib/utils';

const accessKey = 'accessKey1';
const namespace = 'default';
const bucketName = 'bucketname';
const testBucketUID = utils.getResourceUID(namespace, bucketName);


describe('putBucketACL API', () => {
    let metastore;

    beforeEach((done) => {
        metastore = {
            "users": {
                "accessKey1": {
                    "buckets": []
                },
                "accessKey2": {
                    "buckets": []
                }
            },
            "buckets": {}
        };
        metadata.deleteBucket(testBucketUID, ()=> {
            done();
        });
    });

    after((done) => {
        metadata.deleteBucket(testBucketUID, ()=> {
            done();
        });
    });

    it("should parse a grantheader", function testGrantHeader() {
        const grantRead =
            'uri="http://acs.amazonaws.com/groups/s3/LogDelivery", ' +
            'emailAddress="test@testing.com", ' +
            'emailAddress="test2@testly.com", ' +
            'id="sdfsdfsfwwiieohefs"';
        const grantReadHeader =
            utils.parseGrant(grantRead, 'read');
        const firstIdentifier = grantReadHeader[0].identifier;
        assert.strictEqual(firstIdentifier,
            'http://acs.amazonaws.com/groups/s3/LogDelivery');
        const secondIdentifier = grantReadHeader[1].identifier;
        assert.strictEqual(secondIdentifier, 'test@testing.com');
        const thirdIdentifier = grantReadHeader[2].identifier;
        assert.strictEqual(thirdIdentifier, 'test2@testly.com');
        const fourthIdentifier = grantReadHeader[3].identifier;
        assert.strictEqual(fourthIdentifier, 'sdfsdfsfwwiieohefs');
        const fourthType = grantReadHeader[3].userIDType;
        assert.strictEqual(fourthType, 'id');
        const grantType = grantReadHeader[3].grantType;
        assert.strictEqual(grantType, 'read');
    });

    it('should return an error if invalid canned ACL provided', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'not-a-valid-option'
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'not-a-valid-option'
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, 'InvalidArgument');
                        done();
                    });
            });
    });

    it('should set a canned public-read-write ACL', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'public-read-write'
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'public-read-write'
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, null);
                        metadata.getBucket(testBucketUID, (err, md) => {
                            assert.strictEqual(md.acl.Canned,
                                'public-read-write');
                            done();
                        });
                    });
            });
    });

    it('should set a canned public-read ACL followed by'
        + 'a canned authenticated-read ACL', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'public-read'
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'public-read'
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };
        const testACLRequest2 = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'authenticated-read'
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'authenticated-read'
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, null);
                        metadata.getBucket(testBucketUID, (err, md) => {
                            assert.strictEqual(md.acl.Canned,
                                'public-read');
                            bucketPutACL(accessKey, metastore,
                                testACLRequest2, (err) => {
                                    assert.strictEqual(err, null);
                                    metadata.getBucket(testBucketUID,
                                        (err, md) => {
                                            assert.strictEqual(md.acl
                                                .Canned, 'authenticated-read');
                                            done();
                                        });
                                });
                        });
                    });
            });
    });

    it('should set a canned private ACL ' +
        'followed by a log-delivery-write ACL', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'private'
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'private'
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };
        const testACLRequest2 = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'log-delivery-write'
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-acl': 'log-delivery-write'
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, null);
                        metadata.getBucket(testBucketUID, (err, md) => {
                            assert.strictEqual(md.acl.Canned,
                                'private');
                            bucketPutACL(accessKey, metastore,
                                testACLRequest2, (err) => {
                                    assert.strictEqual(err, null);
                                    metadata.getBucket(testBucketUID,
                                        (err, md) => {
                                            assert.strictEqual(md.acl
                                                .Canned, 'log-delivery-write');
                                            done();
                                        });
                                });
                        });
                    });
            });
    });

    it('should set ACLs provided in request headers', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-grant-full-control':
                    'emailaddress="sampleaccount1@sampling.com"' +
                    ',emailaddress="sampleaccount2@sampling.com"',
                'x-amz-grant-read':
                    'uri="http://acs.amazonaws.com/groups/s3/LogDelivery"',
                'x-amz-grant-write':
                    'uri="http://acs.amazonaws.com/groups/global/AllUsers"',
                'x-amz-grant-read-acp':
                    'id="79a59df900b949e55d96a1e698fbacedfd6e09d98eac' +
                    'f8f8d5218e7cd47ef2be"',
                'x-amz-grant-write-acp':
                    'id="79a59df900b949e55d96a1e698fbacedfd6e09d98eac' +
                    'f8f8d5218e7cd47ef2bf"',
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-grant-full-control':
                    'emailaddress="sampleaccount1@sampling.com"' +
                    ',emailaddress="sampleaccount2@sampling.com"',
                'x-amz-grant-read':
                    'uri="http://acs.amazonaws.com/groups/s3/LogDelivery"',
                'x-amz-grant-write':
                        'uri="http://acs.amazonaws.com/groups/global/AllUsers"',
                'x-amz-grant-read-acp':
                    'id="79a59df900b949e55d96a1e698fbacedfd6e09d98eac' +
                    'f8f8d5218e7cd47ef2be"',
                'x-amz-grant-write-acp':
                    'id="79a59df900b949e55d96a1e698fbacedfd6e09d98eac' +
                    'f8f8d5218e7cd47ef2bf"',
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };
        const canonicalIDforSample1 =
            '79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be';
        const canonicalIDforSample2 =
            '79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2bf';

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, null);
                        metadata.getBucket(testBucketUID, (err, md) => {
                            assert.strictEqual(md.acl.READ[0],
                                'http://acs.amazonaws.com/' +
                                'groups/s3/LogDelivery');
                            assert.strictEqual(md.acl.WRITE[0],
                                'http://acs.amazonaws.com/' +
                                'groups/global/AllUsers');
                            assert(md.acl.FULL_CONTROL
                                .indexOf(canonicalIDforSample1) > -1);
                            assert(md.acl.FULL_CONTROL
                                .indexOf(canonicalIDforSample2) > -1);
                            assert(md.acl.READ_ACP
                                .indexOf(canonicalIDforSample1) > -1);
                            assert(md.acl.WRITE_ACP
                                .indexOf(canonicalIDforSample2) > -1);
                            done();
                        });
                    });
            });
    });

    it('should return an error if invalid email ' +
        'provided in ACL header request', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-grant-full-control':
                    'emailaddress="sampleaccount1@sampling.com"' +
                    ',emailaddress="nonexistentEmail@sampling.com"',
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-grant-full-control':
                    'emailaddress="sampleaccount1@sampling.com"' +
                    ',emailaddress="nonexistentEmail@sampling.com"',
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err,
                            'UnresolvableGrantByEmailAddress');
                        done();
                    });
            });
    });

    it('should set ACLs provided in request body', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            post: {
                '<AccessControlPolicy xmlns':
                    '"http://s3.amazonaws.com/doc/2006-03-01/">' +
                  '<Owner>' +
                    '<ID>852b113e7a2f25102679df27bb0ae12b3f85be6' +
                    'BucketOwnerCanonicalUserID</ID>' +
                    '<DisplayName>OwnerDisplayName</DisplayName>' +
                  '</Owner>' +
                  '<AccessControlList>' +
                    '<Grant>' +
                      '<Grantee xsi:type="CanonicalUser">' +
                        '<ID>852b113e7a2f25102679df27bb0ae12b3f85be6' +
                        'BucketOwnerCanonicalUserID</ID>' +
                        '<DisplayName>OwnerDisplayName</DisplayName>' +
                      '</Grantee>' +
                      '<Permission>FULL_CONTROL</Permission>' +
                    '</Grant>' +
                    '<Grant>' +
                      '<Grantee xsi:type="Group">' +
                        '<URI>http://acs.amazonaws.com/groups/' +
                        'global/AllUsers</URI>' +
                      '</Grantee>' +
                      '<Permission>READ</Permission>' +
                    '</Grant>' +
                    '<Grant>' +
                      '<Grantee xsi:type="Group">' +
                        '<URI>http://acs.amazonaws.com/groups/s3/Log' +
                        'Delivery</URI>' +
                      '</Grantee>' +
                      '<Permission>WRITE</Permission>' +
                    '</Grant>' +
                    '<Grant>' +
                      '<Grantee xsi:type="AmazonCustomerByEmail">' +
                        '<EmailAddress>sampleaccount1@sampling.com' +
                        '</EmailAddress>' +
                      '</Grantee>' +
                      '<Permission>WRITE_ACP</Permission>' +
                    '</Grant>' +
                    '<Grant>' +
                      '<Grantee xsi:type="CanonicalUser">' +
                        '<ID>f30716ab7115dcb44a5ef76e9d74b8e20567f63' +
                        'TestAccountCanonicalUserID</ID>' +
                      '</Grantee>' +
                      '<Permission>READ_ACP</Permission>' +
                    '</Grant>' +
                  '</AccessControlList>' +
                '</AccessControlPolicy>'},
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };
        const canonicalIDforSample1 =
            '79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be';

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, null);
                        metadata.getBucket(testBucketUID, (err, md) => {
                            assert.strictEqual(md.acl.Canned, '');
                            assert.strictEqual(md.acl.FULL_CONTROL[0],
                                '852b113e7a2f25102679df27bb0ae12b3f85be6' +
                                'BucketOwnerCanonicalUserID');
                            assert.strictEqual(md.acl.READ[0],
                                'http://acs.amazonaws.com/' +
                                'groups/global/AllUsers');
                            assert.strictEqual(md.acl.WRITE[0],
                                'http://acs.amazonaws.com/' +
                                'groups/s3/LogDelivery');
                            assert.strictEqual(md.acl.WRITE_ACP[0],
                                canonicalIDforSample1);
                            assert.strictEqual(md.acl.READ_ACP[0],
                                'f30716ab7115dcb44a5e' +
                                'f76e9d74b8e20567f63' +
                                'TestAccountCanonicalUserID');
                            done();
                        });
                    });
            });
    });

    it('should return an error if invalid email ' +
    'address provided in ACLs set out in request body', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            post: {
                '<AccessControlPolicy xmlns':
                    '"http://s3.amazonaws.com/doc/2006-03-01/">' +
                  '<Owner>' +
                    '<ID>852b113e7a2f25102679df27bb0ae12b3f85be6' +
                    'BucketOwnerCanonicalUserID</ID>' +
                    '<DisplayName>OwnerDisplayName</DisplayName>' +
                  '</Owner>' +
                  '<AccessControlList>' +
                    '<Grant>' +
                      '<Grantee xsi:type="AmazonCustomerByEmail">' +
                        '<EmailAddress>xyz@amazon.com</EmailAddress>' +
                      '</Grantee>' +
                      '<Permission>WRITE_ACP</Permission>' +
                    '</Grant>' +
                  '</AccessControlList>' +
                '</AccessControlPolicy>'},
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err,
                            'UnresolvableGrantByEmailAddress');
                        done();
                    });
            });
    });

    it('should return an error if xml provided does not match s3 ' +
    'scheme for setting ACLs', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            // XML below uses the term "PowerGrant" instead of
            // "Grant" which is part of the s3 xml shceme for ACLs
            // so an error should be returned
            post: {
                '<AccessControlPolicy xmlns':
                    '"http://s3.amazonaws.com/doc/2006-03-01/">' +
                  '<Owner>' +
                    '<ID>852b113e7a2f25102679df27bb0ae12b3f85be6' +
                    'BucketOwnerCanonicalUserID</ID>' +
                    '<DisplayName>OwnerDisplayName</DisplayName>' +
                  '</Owner>' +
                  '<AccessControlList>' +
                    '<PowerGrant>' +
                      '<Grantee xsi:type="AmazonCustomerByEmail">' +
                        '<EmailAddress>xyz@amazon.com</EmailAddress>' +
                      '</Grantee>' +
                      '<Permission>WRITE_ACP</Permission>' +
                    '</PowerGrant>' +
                  '</AccessControlList>' +
                '</AccessControlPolicy>'},
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, 'MalformedACLError');
                        done();
                    });
            });
    });

    it('should return an error if malformed xml provided', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            // XML below fails to close each container properly
            // so an error should be returned
            post: {
                '<AccessControlPolicy xmlns':
                    '"http://s3.amazonaws.com/doc/2006-03-01/">' +
                  '<Owner>' +
                    '<ID>852b113e7a2f25102679df27bb0ae12b3f85be6' +
                    'BucketOwnerCanonicalUserID</ID>' +
                    '<DisplayName>OwnerDisplayName</DisplayName>' +
                  '<Owner>' +
                  '<AccessControlList>' +
                    '<Grant>' +
                      '<Grantee xsi:type="AmazonCustomerByEmail">' +
                        '<EmailAddress>xyz@amazon.com</EmailAddress>' +
                      '<Grantee>' +
                      '<Permission>WRITE_ACP</Permission>' +
                    '<Grant>' +
                  '<AccessControlList>' +
                '<AccessControlPolicy>'},
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, 'MalformedXML');
                        done();
                    });
            });
    });

    it('should return an error if invalid group ' +
    'uri provided in ACLs set out in request body', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            // URI in grant below is not valid group URI for s3
            post: {
                '<AccessControlPolicy xmlns':
                    '"http://s3.amazonaws.com/doc/2006-03-01/">' +
                  '<Owner>' +
                    '<ID>852b113e7a2f25102679df27bb0ae12b3f85be6' +
                    'BucketOwnerCanonicalUserID</ID>' +
                    '<DisplayName>OwnerDisplayName</DisplayName>' +
                  '</Owner>' +
                  '<AccessControlList>' +
                  '<Grant>' +
                    '<Grantee xsi:type="Group">' +
                      '<URI>http://acs.amazonaws.com/groups/' +
                      'global/NOTAVALIDGROUP</URI>' +
                    '</Grantee>' +
                    '<Permission>READ</Permission>' +
                  '</Grant>' +
                  '</AccessControlList>' +
                '</AccessControlPolicy>'},
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, 'InvalidArgument');
                        done();
                    });
            });
    });

    it('should return an error if invalid group uri' +
        'provided in ACL header request', (done) => {
        const testBucketPutRequest = {
            lowerCaseHeaders: {},
            headers: {host: `${bucketName}.s3.amazonaws.com`},
            url: '/',
            namespace: namespace
        };
        const testACLRequest = {
            lowerCaseHeaders: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-grant-full-control':
                    'uri="http://acs.amazonaws.com/groups/' +
                    'global/NOTAVALIDGROUP"',
            },
            headers: {
                host: `${bucketName}.s3.amazonaws.com`,
                'x-amz-grant-full-control':
                    'uri="http://acs.amazonaws.com/groups/' +
                    'global/NOTAVALIDGROUP"',
            },
            url: '/?acl',
            namespace: namespace,
            query: {
                acl: ''
            }
        };

        bucketPut(accessKey, metastore, testBucketPutRequest,
            (err, success) => {
                assert.strictEqual(success, 'Bucket created');
                bucketPutACL(accessKey, metastore, testACLRequest,
                    (err) => {
                        assert.strictEqual(err, 'InvalidArgument');
                        done();
                    });
            });
    });
});
