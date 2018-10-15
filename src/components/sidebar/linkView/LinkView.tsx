import * as React from 'react';
import { inject, observer } from 'mobx-react';
import { Checkbox, Dropdown, Button, TransitToggleButtonBar } from '../../controls';
import ButtonType from '../../../enums/buttonType';
import TransitType from '../../../enums/transitType';
import InputContainer from '../InputContainer';
import MultiTabTextarea from './MultiTabTextarea';
import { SidebarStore } from '../../../stores/sidebarStore';
import ViewHeader from '../ViewHeader';
import * as s from './linkView.scss';

interface ILinkViewState {
    selectedTransitType: TransitType;
}

interface ILinkViewProps {
    sidebarStore?: SidebarStore;
}

@inject('sidebarStore')
@observer
class LinkView extends React.Component<ILinkViewProps, ILinkViewState> {
    constructor(props: any) {
        super(props);
        this.state = {
            selectedTransitType: TransitType.BUS,
        };
    }

    public componentDidMount() {
        if (this.props.sidebarStore) {
            // TODO: fetch GraphSQL with linkId
            // const linkId = this.props.sidebarStore!.openLinkId;
        }
    }

    public componentWillUnmount() {
        this.props.sidebarStore!.setOpenLinkId(null);
    }

    private toggleSelectedTransitType = (selectedTransitType: TransitType): void => {
        this.setState({ selectedTransitType });
    }

    private getFilters = () => {
        return [this.state.selectedTransitType];
    }

    public toggleEditing = () => {
    }

    // TODO
    public onChange = () => {
    }

    public render(): any {
        return (
        <div className={s.linkView}>
            <ViewHeader
                header='Reitin 1016 linkki'
                toggleEditing={this.toggleEditing}
            />
            <div className={s.topic}>
                REITIN SUUNNAN TIEDOT
            </div>
            <div className={s.flexRow}>
                <div className={s.column}>
                    <div className={s.flexInnerRow}>
                        <InputContainer
                            label='REITTITUNNUS'
                            placeholder='1016'
                        />
                        <InputContainer
                            label='SUUNTA'
                            placeholder='Suunta 1'
                        />
                    </div>
                    <div className={s.flexInnerRow}>
                        <InputContainer
                            label='VOIM. AST'
                            placeholder='01.09.2017'
                        />
                        <InputContainer
                            label='VIIM. VOIM'
                            placeholder='31.12.2050'
                        />
                    </div>
                    <InputContainer
                        label='NIMI'
                        placeholder='Rautatientori - Korkeasaari'
                    />
                </div>
                <div className={s.flexRow}>
                    <div className={s.flexInnerRow}>
                        <div className={s.inputContainer}>
                            <div className={s.subTopic}>
                                TIEDOT
                            </div>
                            <input
                                placeholder=''
                                type='text'
                                className={s.textArea}
                                readOnly={true}
                            />
                        </div>
                    </div>
                </div>
            </div>
            <div className={s.sectionDivider}/>
            <div className={s.flexRow}>
                <div className={s.topic}>
                    REITIN LINKKI
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.flexInnerRowFlexEnd}>
                    <div className={s.inputContainer}>
                        <div className={s.subTopic}>
                            ALKU
                        </div>
                        <input
                            placeholder='1020112'
                            type='text'
                        />
                    </div>
                    <div className={s.inputContainer}>
                        <Dropdown
                            onChange={this.onChange}
                            items={['P', 'P1', 'P2']}
                            selected={'P'}
                        />
                    </div>
                    <div className={s.inputContainer}>
                        <input
                            placeholder='Rautatientori'
                            type='text'
                        />
                    </div>
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.flexInnerRowFlexEnd}>
                    <div className={s.inputContainer}>
                        <div className={s.subTopic}>
                            LOPPU
                        </div>
                        <input
                            placeholder='1020126'
                            type='text'
                        />
                    </div>
                    <div className={s.inputContainer}>
                        <Dropdown
                            onChange={this.onChange}
                            items={['P', 'P1', 'P2']}
                            selected={'P'}
                        />
                    </div>
                    <div className={s.inputContainer}>
                        <input
                            placeholder='Rautatientori'
                            type='text'
                        />
                    </div>
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.inputContainer}>
                    <div className={s.subTopic}>
                        KUTSU-/JÄTTÖ-/OTTOP
                    </div>
                    <Dropdown
                        onChange={this.onChange}
                        items={['0 - Ei', '1 - Ei', '2 - Ei']}
                        selected={'0 - Ei'}
                    />
                </div>
                <div className={s.inputContainer}>
                    <div className={s.subTopic}>
                        AJANTASAUSPYSÄKKI
                    </div>
                    <Dropdown
                        onChange={this.onChange}
                        items={['Kyllä', 'Ei']}
                        selected={'Ei'}
                    />
                </div>
                <div className={s.inputContainer}>
                    <div className={s.subTopic}>
                        VÄLIPISTEAIKAPYSÄKKI
                    </div>
                    <Dropdown
                        onChange={this.onChange}
                        items={['Kyllä', 'Ei']}
                        selected={'Kyllä'}
                    />
                </div>
            </div>
            <div className={s.inputContainer}>
                <div className={s.subTopic}>
                    VERKKO
                </div>
                <div className={s.transitButtonBar}>
                    <TransitToggleButtonBar
                        toggleSelectedTransitType={this.toggleSelectedTransitType}
                        selectedTransitTypes={this.getFilters()}
                    />
                </div>
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='SUUNTA'
                    placeholder='Suunta 1'
                />
                <InputContainer
                    label='OS. NRO'
                    placeholder='2 B'
                />
                <InputContainer
                    label='LINKIN PITUUS'
                    placeholder='2'
                />
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='KATU'
                    placeholder='Rautatientori'
                />
                <InputContainer
                    label='KATUOSAN OS. NRO'
                    placeholder='1'
                />
            </div>
            <div className={s.flexRow}>
                <div className={s.subTopic}>
                    ALKUSOLMUN SARAKE NRO
                </div>
                <div className={s.subTopic}>
                    VIIM. LINKIN LOPPUSOLMU SARAKE NRO
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.flexInnerRow}>
                    <input
                        placeholder='1'
                        type='text'
                        className={s.smallInput}
                    />
                    <Checkbox
                        checked={false}
                        text={'Ohitusaika kirja-aikat.'}
                        onClick={this.onChange}
                    />
                </div>
                <div className={s.flexInnerRow}>
                    <input
                        placeholder='1'
                        type='text'
                        className={s.smallInput}
                    />
                    <Checkbox
                        checked={false}
                        text={'Ohitusaika kirja-aikat.'}
                        onClick={this.onChange}
                    />
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.flexInnerRow}>
                    <input
                        placeholder='1'
                        type='text'
                        className={s.smallInput}
                    />
                    <Checkbox
                        checked={false}
                        text={'Ohitusaika kirja-aikat.'}
                        onClick={this.onChange}
                    />
                </div>
                <div className={s.flexInnerRow}>
                    <input
                        placeholder='1'
                        type='text'
                        className={s.smallInput}
                    />
                    <Checkbox
                        checked={false}
                        text={'Ohitusaika kirja-aikat.'}
                        onClick={this.onChange}
                    />
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.inputContainer}>
                    <div className={s.subTopic}>
                        ALKUSOLMUN SÄDE JA PAIKKA
                    </div>
                    <div className={s.flexInnerRow}>
                        <input
                            placeholder=''
                            type='text'
                            className={s.mediumSmallInput}
                        />
                        <input
                            placeholder='1RT'
                            type='text'
                            className={s.mediumSmallInput}
                        />
                    </div>
                </div>
                <div className={s.inputContainer}>
                    <div className={s.subTopic}>
                        LOPPUSOLMUN SÄDE JA PAIKKA
                    </div>
                    <div className={s.flexInnerRow}>
                        <input
                            placeholder=''
                            type='text'
                            className={s.mediumSmallInput}
                        />
                        <input
                            placeholder='1RT'
                            type='text'
                            className={s.mediumSmallInput}
                        />
                    </div>
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.flexGrow}>
                    <div className={s.subTopic}>
                        ALKUSOLMU PAIKKANA
                    </div>
                    <Dropdown
                        onChange={this.onChange}
                        items={['Kyllä', 'Ei']}
                        selected={'Kyllä'}
                    />
                </div>
                <div className={s.flexFiller} />
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='PÄIVITTÄJÄ'
                    placeholder='Vuori Tuomas'
                />
                <InputContainer
                    label='PÄIVITYSPVM'
                    placeholder='23.08.2017'
                />
            </div>
            <div className={s.sectionDivider}/>
            <MultiTabTextarea
                tabs={['Tariffialueet', 'Määränpäät', 'Ajoajat']}
            />
            <div className={s.buttonBar}>
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Seuraava'}
                />
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Edellinen'}
                />
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Alkusolmu'}
                />
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Loppusolmu'}
                />
            </div>
        </div>
        );
    }
}
export default LinkView;
