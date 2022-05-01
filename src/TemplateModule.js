import React, { useEffect, useState } from 'react';
import { Form, Input, Grid, Message } from 'semantic-ui-react';

// Pre-built Substrate front-end utilities
// for connecting to a node and making a transaction.
import { useSubstrateState } from './substrate-lib';
import { TxButton } from './substrate-lib/components';

// Polkadot-JS utilities for hashing data.
import { blake2AsHex } from '@polkadot/util-crypto';

// Main Proof Of Existence component
const Main = (props) => {
    // Establish an API to talk to the Substrate node.
    const { api, currentAccount } = useSubstrateState();
    // React hooks for all the state variables we track.
    const [status, setStatus] = useState('');
    const [digest, setDigest] = useState('');
    const [owner, setOwner] = useState('');
    const [block, setBlock] = useState(0);

    let fileReader;
    const bufferToDigest = () => {
        const content = Array.from(new Uint8Array(fileReader.result))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        const hash = blake2AsHex(content, 256);
        setDigest(hash);
    };

    const handleFileChosen = file => {
        fileReader = new FileReader();
        fileReader.onloadend = bufferToDigest;
        fileReader.readAsArrayBuffer(file);
    };

    useEffect(() => {
        let unsubscribe;

        api.query.templateModule
            .proofs(digest, result => {
                if (result.inspect().inner) {
                    let [tmpAddress, tmpBlock] = result.toHuman()
                    setOwner(tmpAddress);
                    setBlock(tmpBlock);
                } else {
                    setOwner('');
                    setBlock(0);
                }
            })
            .then(unsub => {
                unsubscribe = unsub;
            });
        return () => unsubscribe && unsubscribe();
    }, [digest, api.query.templateModule]);

    const isClaimed = () => {
        return block !== 0;
    }

    return (
        <Grid.Column>
            <h1>Proof of Existence</h1>
            <Form success={!!digest && !isClaimed()}>
                <Form.Field>
                    <Input
                        type="file"
                        id="file"
                        label="Your File"
                        onChange={e => handleFileChosen(e.target.files[0])}
                    />
                    <Message
                        warning
                        header="File Digest Claimed"
                        list={[digest, `Owner: ${owner}`, `Block: ${block}`]}
                    />
                </Form.Field>
                <Form.Field>
                    <TxButton
                        label={"Create Claim"}
                        type="SIGNED-TX"
                        setStatus={setStatus}
                        disabled={isClaimed() || !digest}
                        attrs={{
                            palletRpc: 'templateModule',
                            callable: 'createClaim',
                            inputParams: [digest],
                            paramFields: [true]
                        }}
                    />
                    <TxButton
                        label={"Revoke Claim"}
                        type="SIGNED-TX"
                        setStatus={setStatus}
                        disabled={!isClaimed() || owner !== currentAccount.address}
                        attrs={{
                            palletRpc: 'templateModule',
                            callable: 'revokeClaim',
                            inputParams: [digest],
                            paramFields: [true]
                        }}
                    />
                </Form.Field>
                <div style={{ overflowWrap: 'break-word' }}>{status}</div>
            </Form>
        </Grid.Column>
    );
}

const TemplateModule = (props) => {
    const { api } = useSubstrateState();
    return api.query.templateModule ? <Main {...props} /> : null;
}

export default TemplateModule;