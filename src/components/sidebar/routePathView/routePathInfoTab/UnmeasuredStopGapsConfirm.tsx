import { inject, observer } from 'mobx-react';
import React from 'react';
import * as s from './unmeasuredStopGapsConfirm.scss';

const UnmeasuredStopGapsConfirm = inject()(
    observer(() => {
        return (
            <div className={s.unmeasuredStopGapPrompt} data-cy='unmeasuredStopGapsPrompt'>
                <div>
                    Haluatko varmasti edetä reitinsuunnan tallennukseen? Reitinsuunnan pituus ei ole
                    sama kuin automaattisesti pysäkkivälien ja linkkien avulla saatu pituus.
                </div>
                <div>Lista mittaamattomista pysäkkiväleistä:</div>
            </div>
        );
    })
);

export default UnmeasuredStopGapsConfirm;
