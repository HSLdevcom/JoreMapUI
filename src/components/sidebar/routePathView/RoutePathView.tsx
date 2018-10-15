import * as React from 'react';
import routeBuilder  from '~/routing/routeBuilder';
import subSites from '~/routing/subSites';
import ViewHeader from '../ViewHeader';
import InputContainer from '../InputContainer';
import { Button, Dropdown, Checkbox } from '../../controls';
import ButtonType from '../../../enums/buttonType';
import * as s from './routePathView.scss';

interface IRoutePathViewState {
    isEditingDisabled: boolean;
    isAddingEnabled: boolean;
}

interface IRoutePathViewProps {
}

class RoutePathView extends React.Component<IRoutePathViewProps, IRoutePathViewState>{
    constructor(props: any) {
        super(props);
        this.state = {
            isEditingDisabled: true,
            isAddingEnabled: false,
        };
    }

    componentDidMount() {
        const currentLocation = routeBuilder.getCurrentLocation();
        if (currentLocation === subSites.newRoutePath) {
            this.setState({
                isAddingEnabled: true,
                isEditingDisabled: false,
            });
        }
    }

    public toggleEditing = () => {
        const isEditingDisabled = !this.state.isEditingDisabled;
        this.setState({ isEditingDisabled });
    }

    // TODO
    public onChange = () => {
    }

    public render(): any {
        return (
        <div className={s.routePathView}>
            <ViewHeader
                header={(this.state.isAddingEnabled) ?
                    'Luo uusi reitinsuunta' :
                    'Reitin suunta 1016'
                }
                toggleEditing={this.toggleEditing}
                hideEditButton={this.state.isAddingEnabled}
            />
            <div className={s.routePathTimestamp}>01.09.2017</div>
            <div className={s.padding} />
            <div className={s.padding} />
            <div className={s.topic}>
                REITIN OTSIKKOTIEDOT
            </div>
            <div className={s.routeInformationContainer}>
                <div className={s.flexInnerColumn}>
                    <div>Reittitunnus</div>
                    <div>1016</div>
                </div>
                <div className={s.flexInnerColumn}>
                    <div>Linja</div>
                    <div>1016</div>
                </div>
                <div className={s.flexInnerColumn}>
                    <div>Päivityspvm</div>
                    <div>23.08.2017</div>
                </div>
                <div className={s.flexInnerColumn}>
                    <div>Päivittää</div>
                    <div>Vuori Tuomas</div>
                </div>
            </div>
            <div className={s.sectionDivider} />
            <div className={s.padding} />
            <div className={s.topic}>
                REITINSUUNNAN TIEDOT
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='REITIN NIMI SUOMEKSI'
                    disabled={this.state.isEditingDisabled}
                />
                <InputContainer
                    label='REITIN NIMI RUOTSIKSI'
                    disabled={this.state.isEditingDisabled}
                />
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='LÄHTÖPAIKKA SUOMEKSI'
                    disabled={this.state.isEditingDisabled}
                />
                <InputContainer
                    label='PÄÄTEPAIKKA SUOMEKSI'
                    disabled={this.state.isEditingDisabled}
                />
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='LÄHTÖPAIKKA RUOTSIKSI'
                    disabled={this.state.isEditingDisabled}
                />
                <InputContainer
                    label='PÄÄTEPAIKKA RUOTSIKSI'
                    disabled={this.state.isEditingDisabled}
                />
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='LYHENNE SUOMEKSI'
                    disabled={this.state.isEditingDisabled}
                />
                <InputContainer
                    label='LYHENNE RUOTSIKSI'
                    disabled={this.state.isEditingDisabled}
                />
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='VOIM. AST'
                    disabled={this.state.isEditingDisabled}
                />
                <InputContainer
                    label='VIIM.VOIM.OLO'
                    disabled={this.state.isEditingDisabled}
                />
                <InputContainer
                    label='PITUUS'
                    disabled={this.state.isEditingDisabled}
                />
                <div className={s.flexInnerRowFlexEnd}>
                    <Button
                        onClick={this.onChange}
                        type={ButtonType.ROUND}
                        text={'Laske'}
                    />
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.inputContainer}>
                    <div className={s.subTopic}>
                        SUUNTA
                    </div>
                    <Dropdown
                        onChange={this.onChange}
                        items={['Suunta 2']}
                        selected={'Suunta 1'}
                    />
                </div>
                <div className={s.inputContainer}>
                    <div className={s.subTopic}>
                        POIKKEUSREITTI
                    </div>
                    <div className={s.padding} />
                    <div className={s.flexInnerRow}>
                        <Checkbox
                            checked={false}
                            text={'Ei'}
                            onClick={this.onChange}
                        />
                        <div className={s.flexFiller} />
                        <Checkbox
                            checked={false}
                            text={'Kyllä'}
                            onClick={this.onChange}
                        />
                        <div className={s.flexFiller} />
                    </div>
                </div>
            </div>
            <div className={s.flexRow}>
                <div className={s.flexGrow}>
                    <div className={s.subTopic}>
                        SOLMUTYYPIT
                    </div>
                    <Dropdown
                        onChange={this.onChange}
                        items={['Kaikki solmut']}
                        selected={'Kaikki solmut'}
                    />
                </div>
                <div className={s.flexFiller} />
            </div>
            <div className={s.flexRow}>
                <InputContainer
                    label='PÄIVITYSPVM'
                    disabled={this.state.isEditingDisabled}
                />
                <InputContainer
                    label='PÄIVITTÄJÄ'
                    disabled={this.state.isEditingDisabled}
                />
            </div>
            <div className={s.sectionDivider}/>
            <div className={s.flexRow}>
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Varustelutiedot'}
                />
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Solmu'}
                />
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Solmut Exceliin'}
                />
            </div>
            <div className={s.flexRow}>
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Linkki'}
                />
                <Button
                    onClick={this.onChange}
                    type={ButtonType.ROUND}
                    text={'Aikataulu'}
                />
                <div className={s.flexButtonFiller} />
            </div>
            <div className={s.sectionDivider}/>
            <div className={s.inputContainer}>
                <div className={s.topic}>
                    KARTTA
                </div>
                <div className={s.padding} />
                <div className={s.flexInnerRow}>
                    <Button
                        onClick={this.onChange}
                        type={ButtonType.ROUND}
                        text={'Kartta'}
                    />
                    <Checkbox
                        checked={false}
                        text={'Muotopisteet kartalle'}
                        onClick={this.onChange}
                    />
                    <div className={s.flexButtonFiller} />
                </div>
            </div>
            <div className={s.padding} />
            <div className={s.inputContainer}>
                Esitettävien ajoaikojen kausi ja aikajakso
            </div>
            <div className={s.flexRow}>
                <Dropdown
                    onChange={this.onChange}
                    items={['Suunta 2']}
                    selected={'Suunta 1'}
                />
                <Dropdown
                    onChange={this.onChange}
                    items={['Suunta 2']}
                    selected={'Suunta 1'}
                />
            </div>
            {this.state.isAddingEnabled &&
                <div>
                    <div className={s.sectionDivider} />
                    <div className={s.padding} />
                    <div className={s.flexRow}>
                        <div className={s.flexButtonFiller} />
                        <Button
                            onClick={this.onChange}
                            type={ButtonType.SAVE}
                            text={'Tallenna reitinsuunta'}
                        />
                        <div className={s.flexButtonFiller} />
                    </div>
                </div>
            }
        </div>
        );
    }
}
export default RoutePathView;
